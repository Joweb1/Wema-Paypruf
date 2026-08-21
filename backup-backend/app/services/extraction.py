from __future__ import annotations

from collections.abc import Mapping
from dataclasses import asdict, dataclass, is_dataclass
from pathlib import Path
from typing import Any

from backend.app.core.errors import AppError
from backend.app.services.normalization import (
    decimal_to_minor,
    normalize_currency,
    parse_date,
    parse_time,
)

try:
    from ml.extraction import ReceiptExtractionError, ReceiptExtractionService
except ModuleNotFoundError as import_error:  # Allows backend-only tooling before ML lands.
    if import_error.name not in {"ml", "ml.extraction"}:
        raise

    class ReceiptExtractionError(Exception):
        """Fallback type used only when the sibling ML package is unavailable."""

    ReceiptExtractionService = None  # type: ignore[assignment,misc]


class LazyReceiptExtractor:
    def __init__(self) -> None:
        self._service: Any = None

    def extract(self, path: Path, mime_type: str) -> Any:
        if ReceiptExtractionService is None:
            raise ReceiptExtractionError(
                "The receipt extraction package is not available in this environment."
            )
        if self._service is None:
            self._service = ReceiptExtractionService()
        return self._service.extract(path=path, mime_type=mime_type)


@dataclass(frozen=True, slots=True)
class ExtractionPayload:
    amount_minor: int | None
    currency: str | None
    reference: str | None
    bank: str | None
    transaction_date: Any
    transaction_time: Any
    sender_name: str | None
    recipient_name: str | None
    status_text: str | None
    account_hint: str | None
    confidence: float
    raw_text: str


def _mapping(result: Any) -> Mapping[str, Any]:
    if isinstance(result, Mapping):
        return result
    if hasattr(result, "model_dump"):
        return result.model_dump()
    if is_dataclass(result):
        return asdict(result)
    if hasattr(result, "__dict__"):
        return vars(result)
    raise AppError(
        422,
        "OCR_EXTRACTION_FAILED",
        "The receipt extractor returned an unsupported result.",
    )


def _text(value: Any, *, max_length: int = 500) -> str | None:
    if value is None:
        return None
    normalized = " ".join(str(value).split()).strip()
    return normalized[:max_length] or None


def coerce_extraction(result: Any) -> ExtractionPayload:
    data = _mapping(result)
    raw_amount = data.get("amount")
    amount_minor: int | None = None
    if raw_amount not in (None, ""):
        try:
            amount_minor = decimal_to_minor(raw_amount)
        except ValueError:
            amount_minor = None

    raw_confidence = data.get("confidence", 0.0)
    try:
        confidence = float(raw_confidence or 0.0)
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    raw_text = data.get("raw_text", data.get("raw_normalized_text", ""))
    return ExtractionPayload(
        amount_minor=amount_minor,
        currency=normalize_currency(_text(data.get("currency"), max_length=12)),
        reference=_text(data.get("reference"), max_length=120),
        bank=_text(data.get("bank", data.get("provider")), max_length=120),
        transaction_date=parse_date(data.get("transaction_date", data.get("date"))),
        transaction_time=parse_time(data.get("transaction_time", data.get("time"))),
        sender_name=_text(data.get("sender_name"), max_length=160),
        recipient_name=_text(data.get("recipient_name"), max_length=160),
        status_text=_text(data.get("status_text", data.get("status")), max_length=120),
        account_hint=_text(
            data.get("account_hint", data.get("account_details")), max_length=80
        ),
        confidence=confidence,
        raw_text=str(raw_text or "")[:50_000],
    )


def extraction_error(exc: Exception) -> AppError:
    return AppError(
        422,
        "OCR_EXTRACTION_FAILED",
        "PayPruf could not read this receipt. Try a clearer PNG, JPG, or PDF.",
        {"reason": str(exc)[:200]} if str(exc) else None,
    )

