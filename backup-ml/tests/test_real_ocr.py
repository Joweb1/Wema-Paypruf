from pathlib import Path

import pytest

from ml.extraction import ReceiptExtractionService

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


@pytest.fixture(scope="module")
def service() -> ReceiptExtractionService:
    return ReceiptExtractionService()


@pytest.mark.parametrize(
    ("filename", "mime_type", "amount", "reference"),
    (
        ("receipt_confirmed_001.png", "image/png", "25000.00", "PAYPRUF-DEMO-001"),
        ("receipt_mismatch_002.png", "image/png", "25000.00", "PAYPRUF-DEMO-002"),
        ("receipt_not_received_003.png", "image/png", "15000.00", "PAYPRUF-DEMO-003"),
        ("receipt_pending_004.png", "image/png", "30000.00", "PAYPRUF-DEMO-004"),
        ("receipt_mismatch_PAYPRUF-DEMO-002.jpg", "image/jpeg", "25000.00", "PAYPRUF-DEMO-002"),
        ("receipt_confirmed_PAYPRUF-DEMO-001.pdf", "application/pdf", "25000.00", "PAYPRUF-DEMO-001"),
    ),
)
def test_real_rapidocr_extracts_synthetic_receipts(
    service: ReceiptExtractionService,
    filename: str,
    mime_type: str,
    amount: str,
    reference: str,
) -> None:
    result = service.extract(FIXTURES / filename, mime_type)

    assert result.as_dict()["amount"] == amount
    assert result.reference == reference
    assert result.currency == "NGN"
    assert result.bank == "Demo Bank"
    assert result.recipient_name == "Tola Fashion"
    assert result.account_hint == "ending 6789"
    assert result.confidence >= 0.80
