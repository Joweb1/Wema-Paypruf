"""Receipt extraction orchestration."""

from __future__ import annotations

from pathlib import Path

from .errors import ReceiptExtractionError
from .models import ExtractedReceipt
from .parser import parse_receipt
from .preprocessing import preprocess_receipt
from .providers import OCRProvider, RapidOCRProvider


class ReceiptExtractionService:
    """Extract structured supporting evidence from an uploaded receipt."""

    def __init__(self, provider: OCRProvider | None = None) -> None:
        self._provider = provider or RapidOCRProvider()

    def extract(self, path: Path, mime_type: str) -> ExtractedReceipt:
        """Read a PNG/JPEG/PDF receipt and return normalized fields.

        This method never decides whether a payment is confirmed, pending,
        mismatched, or not received. That responsibility belongs to the backend
        matching service and merchant-side transaction provider.
        """

        if not isinstance(path, Path):
            path = Path(path)
        try:
            image = preprocess_receipt(path, mime_type)
            recognized = self._provider.recognize(image)
            return parse_receipt(recognized)
        except ReceiptExtractionError:
            raise
        except Exception as exc:
            raise ReceiptExtractionError(
                "EXTRACTION_FAILED",
                "PayPruf could not extract this receipt. Please try another image.",
            ) from exc
