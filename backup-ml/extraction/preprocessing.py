"""Bounded image loading, first-page PDF rendering, and OCR preprocessing."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, UnidentifiedImageError

from .errors import ReceiptExtractionError

SUPPORTED_MIME_TYPES = frozenset({"image/png", "image/jpeg", "application/pdf"})
MAX_SOURCE_PIXELS = 25_000_000
MAX_OCR_EDGE = 2400
MIN_OCR_WIDTH = 1200


def _render_pdf_first_page(path: Path) -> Image.Image:
    try:
        import pypdfium2 as pdfium

        document = pdfium.PdfDocument(str(path))
        try:
            if len(document) < 1:
                raise ReceiptExtractionError(
                    "INVALID_RECEIPT",
                    "The uploaded PDF has no pages. Please upload a receipt with one page.",
                )
            page = document[0]
            try:
                width, height = page.get_size()
                scale = max(1.0, min(3.0, MAX_OCR_EDGE / max(width, height)))
                image = page.render(scale=scale).to_pil().convert("RGB")
            finally:
                page.close()
        finally:
            document.close()
        return image
    except ReceiptExtractionError:
        raise
    except Exception as exc:
        raise ReceiptExtractionError(
            "INVALID_RECEIPT",
            "PayPruf could not open this PDF receipt. Export it again or upload a PNG/JPEG.",
        ) from exc


def _load_image(path: Path) -> Image.Image:
    try:
        with Image.open(path) as source:
            source.load()
            image = ImageOps.exif_transpose(source).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ReceiptExtractionError(
            "INVALID_RECEIPT",
            "PayPruf could not open this receipt image. Upload a valid PNG, JPEG, or PDF.",
        ) from exc
    return image


def _validate_dimensions(image: Image.Image) -> None:
    width, height = image.size
    if width < 1 or height < 1 or width * height > MAX_SOURCE_PIXELS:
        raise ReceiptExtractionError(
            "INVALID_RECEIPT",
            "This receipt has unsupported image dimensions. Try a smaller export.",
            details={"maximum_pixels": MAX_SOURCE_PIXELS},
        )


def preprocess_receipt(path: Path, mime_type: str) -> Image.Image:
    """Load one receipt into a bounded, high-contrast RGB image for OCR."""

    path = Path(path)
    normalized_mime = mime_type.split(";", 1)[0].strip().lower()
    if normalized_mime == "image/jpg":
        normalized_mime = "image/jpeg"
    if normalized_mime not in SUPPORTED_MIME_TYPES:
        raise ReceiptExtractionError(
            "UNSUPPORTED_RECEIPT_TYPE",
            "Upload a PNG, JPEG, or single-page PDF receipt.",
            details={"supported_mime_types": sorted(SUPPORTED_MIME_TYPES)},
        )
    if not path.is_file():
        raise ReceiptExtractionError(
            "RECEIPT_NOT_FOUND",
            "The uploaded receipt is no longer available. Please upload it again.",
        )

    image = _render_pdf_first_page(path) if normalized_mime == "application/pdf" else _load_image(path)
    _validate_dimensions(image)

    width, height = image.size
    scale = 1.0
    if width < MIN_OCR_WIDTH:
        scale = MIN_OCR_WIDTH / width
    if max(width, height) * scale > MAX_OCR_EDGE:
        scale = MAX_OCR_EDGE / max(width, height)
    if abs(scale - 1.0) > 0.01:
        image = image.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))),
            Image.Resampling.LANCZOS,
        )

    grayscale = ImageOps.grayscale(image)
    grayscale = ImageOps.autocontrast(grayscale, cutoff=1)
    grayscale = ImageEnhance.Contrast(grayscale).enhance(1.15)
    grayscale = grayscale.filter(ImageFilter.UnsharpMask(radius=1.0, percent=125, threshold=3))
    return grayscale.convert("RGB")
