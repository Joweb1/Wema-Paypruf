from __future__ import annotations

import hashlib
import logging
import os
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from backend.app.core.config import Settings
from backend.app.core.errors import AppError
from backend.app.core.time import utcnow
from backend.app.models import PaymentRequest, Receipt
from backend.app.services.extraction import (
    ReceiptExtractionError,
    coerce_extraction,
    extraction_error,
)
from backend.app.services.payments import clear_current_verification

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
}
ALLOWED_MIME_TYPES = set(ALLOWED_EXTENSIONS.values())


@dataclass(frozen=True, slots=True)
class StoredUpload:
    original_filename: str
    path: Path
    mime_type: str
    size_bytes: int
    sha256: str


def safe_display_filename(filename: str | None) -> str:
    candidate = Path(filename or "receipt").name
    candidate = re.sub(r"[\x00-\x1f\x7f]", "", candidate).strip()
    return (candidate or "receipt")[:255]


def _detect_mime(header: bytes) -> str | None:
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"%PDF-"):
        return "application/pdf"
    return None


def _validate_decodable(path: Path, mime_type: str, settings: Settings) -> None:
    try:
        if mime_type.startswith("image/"):
            from PIL import Image

            with Image.open(path) as image:
                width, height = image.size
                if width <= 0 or height <= 0 or width * height > settings.max_image_pixels:
                    raise AppError(
                        413,
                        "RECEIPT_DIMENSIONS_EXCEEDED",
                        "The receipt image dimensions are too large.",
                    )
                actual = Image.MIME.get(image.format or "")
                if actual != mime_type:
                    raise AppError(
                        415,
                        "INVALID_RECEIPT_TYPE",
                        "The receipt contents do not match its file type.",
                    )
                image.verify()
            return

        import pypdfium2 as pdfium

        document = pdfium.PdfDocument(str(path))
        try:
            page_count = len(document)
            if page_count < 1:
                raise AppError(422, "INVALID_RECEIPT_FILE", "The uploaded PDF has no pages.")
            if page_count > settings.max_pdf_pages:
                raise AppError(
                    413,
                    "PDF_PAGE_LIMIT_EXCEEDED",
                    f"PDF receipts may contain at most {settings.max_pdf_pages} pages.",
                )
            page = document[0]
            try:
                width, height = page.get_size()
                scale = 200 / 72
                if int(width * scale) * int(height * scale) > settings.max_image_pixels:
                    raise AppError(
                        413,
                        "RECEIPT_DIMENSIONS_EXCEEDED",
                        "The rendered PDF page would be too large.",
                    )
            finally:
                page.close()
        finally:
            document.close()
    except AppError:
        raise
    except Exception as exc:
        raise AppError(
            422,
            "INVALID_RECEIPT_FILE",
            "The uploaded receipt is damaged or could not be decoded.",
        ) from exc


async def store_upload(upload: UploadFile, settings: Settings) -> StoredUpload:
    original_filename = safe_display_filename(upload.filename)
    extension = Path(original_filename).suffix.lower()
    expected_mime = ALLOWED_EXTENSIONS.get(extension)
    declared_mime = (upload.content_type or "").split(";", 1)[0].strip().lower()
    if expected_mime is None or declared_mime not in ALLOWED_MIME_TYPES:
        raise AppError(
            415,
            "INVALID_RECEIPT_TYPE",
            "Upload a PNG, JPG, JPEG, or PDF receipt.",
        )
    if declared_mime != expected_mime:
        raise AppError(
            415,
            "INVALID_RECEIPT_TYPE",
            "The receipt extension and MIME type do not match.",
        )

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4().hex
    final_path = (settings.upload_dir / f"{file_id}{extension}").resolve()
    temp_path = (settings.upload_dir / f".{file_id}.upload").resolve()
    upload_root = settings.upload_dir.resolve()
    if not final_path.is_relative_to(upload_root) or not temp_path.is_relative_to(upload_root):
        raise AppError(500, "UPLOAD_STORAGE_ERROR", "Receipt storage could not be initialized.")

    digest = hashlib.sha256()
    size = 0
    header = b""
    try:
        with temp_path.open("xb") as output:
            while True:
                chunk = await upload.read(64 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > settings.max_upload_size_bytes:
                    raise AppError(
                        413,
                        "RECEIPT_TOO_LARGE",
                        f"Receipt files may be at most {settings.max_upload_size_bytes} bytes.",
                    )
                if len(header) < 16:
                    header += chunk[: 16 - len(header)]
                digest.update(chunk)
                output.write(chunk)
        if size == 0:
            raise AppError(422, "EMPTY_RECEIPT", "The uploaded receipt file is empty.")
        detected_mime = _detect_mime(header)
        if detected_mime != expected_mime:
            raise AppError(
                415,
                "INVALID_RECEIPT_TYPE",
                "The receipt contents do not match its file type.",
            )
        await run_in_threadpool(_validate_decodable, temp_path, detected_mime, settings)
        os.replace(temp_path, final_path)
        return StoredUpload(
            original_filename=original_filename,
            path=final_path,
            mime_type=detected_mime,
            size_bytes=size,
            sha256=digest.hexdigest(),
        )
    except Exception:
        temp_path.unlink(missing_ok=True)
        final_path.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()


async def process_receipt_upload(
    session: Session,
    payment: PaymentRequest,
    upload: UploadFile,
    extractor: Any,
    settings: Settings,
) -> tuple[Receipt, bool]:
    stored = await store_upload(upload, settings)
    existing = session.scalar(
        select(Receipt).where(
            Receipt.payment_id == payment.id,
            Receipt.sha256 == stored.sha256,
        )
    )
    if existing is not None:
        stored.path.unlink(missing_ok=True)
        return existing, False

    logger.info(
        "receipt_received",
        extra={"event": "receipt_received", "payment_id": payment.id, "size": stored.size_bytes},
    )
    try:
        raw_result = await run_in_threadpool(
            extractor.extract, stored.path, stored.mime_type
        )
        extraction = coerce_extraction(raw_result)
    except ReceiptExtractionError as exc:
        stored.path.unlink(missing_ok=True)
        raise extraction_error(exc) from exc
    except AppError:
        stored.path.unlink(missing_ok=True)
        raise
    except Exception as exc:
        stored.path.unlink(missing_ok=True)
        logger.exception(
            "receipt_extraction_failed",
            extra={"event": "receipt_extraction_failed", "payment_id": payment.id},
        )
        raise extraction_error(exc) from exc

    now = utcnow()
    receipt = Receipt(
        id=str(uuid.uuid4()),
        payment_id=payment.id,
        original_filename=stored.original_filename,
        storage_path=str(stored.path),
        mime_type=stored.mime_type,
        size_bytes=stored.size_bytes,
        sha256=stored.sha256,
        amount_minor=extraction.amount_minor,
        currency=extraction.currency,
        reference=extraction.reference,
        bank=extraction.bank,
        transaction_date=extraction.transaction_date,
        transaction_time=extraction.transaction_time,
        sender_name=extraction.sender_name,
        recipient_name=extraction.recipient_name,
        status_text=extraction.status_text,
        account_hint=extraction.account_hint,
        confidence=extraction.confidence,
        raw_text=extraction.raw_text,
        extraction_provider=settings.ocr_provider,
        created_at=now,
        extracted_at=now,
    )
    try:
        clear_current_verification(session, payment)
        session.add(receipt)
        session.commit()
        session.refresh(receipt)
    except Exception:
        session.rollback()
        stored.path.unlink(missing_ok=True)
        raise
    logger.info(
        "receipt_extraction_completed",
        extra={
            "event": "receipt_extraction_completed",
            "payment_id": payment.id,
            "receipt_id": receipt.id,
            "confidence": receipt.confidence,
        },
    )
    return receipt, True


def safe_receipt_path(receipt: Receipt, settings: Settings) -> Path:
    path = Path(receipt.storage_path).resolve()
    root = settings.upload_dir.resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise AppError(404, "RECEIPT_FILE_NOT_FOUND", "The receipt preview is unavailable.")
    if receipt.mime_type not in ALLOWED_MIME_TYPES:
        raise AppError(415, "INVALID_RECEIPT_TYPE", "The stored receipt type is not allowed.")
    return path

