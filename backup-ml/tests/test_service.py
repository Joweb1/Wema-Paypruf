from pathlib import Path

import pytest
from PIL import Image

from ml.extraction import ReceiptExtractionError, ReceiptExtractionService
from ml.extraction.models import OCRResult


class _StaticProvider:
    def recognize(self, _image: Image.Image) -> OCRResult:
        return OCRResult(
            lines=("Amount: NGN 25,000.00", "Transaction Reference: PAYPRUF-DEMO-001"),
            scores=(0.99, 0.99),
        )


def test_service_exposes_exact_extract_interface(tmp_path: Path) -> None:
    path = tmp_path / "receipt.png"
    Image.new("RGB", (900, 1200), "white").save(path)

    result = ReceiptExtractionService(provider=_StaticProvider()).extract(path, "image/png")

    assert result.as_dict()["amount"] == "25000.00"
    assert result.reference == "PAYPRUF-DEMO-001"


def test_service_rejects_unsupported_mime_type(tmp_path: Path) -> None:
    path = tmp_path / "receipt.txt"
    path.write_text("not an image", encoding="utf-8")

    with pytest.raises(ReceiptExtractionError) as caught:
        ReceiptExtractionService(provider=_StaticProvider()).extract(path, "text/plain")

    assert caught.value.code == "UNSUPPORTED_RECEIPT_TYPE"
    assert "PNG" in caught.value.message


def test_service_reports_missing_receipt_actionably(tmp_path: Path) -> None:
    with pytest.raises(ReceiptExtractionError) as caught:
        ReceiptExtractionService(provider=_StaticProvider()).extract(tmp_path / "missing.png", "image/png")

    assert caught.value.code == "RECEIPT_NOT_FOUND"
    assert "upload" in caught.value.message.lower()
