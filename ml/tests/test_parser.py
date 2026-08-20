from datetime import date, time
from decimal import Decimal

from ml.extraction.models import OCRResult
from ml.extraction.normalization import (
    normalize_account_hint,
    normalize_reference,
    parse_decimal,
)
from ml.extraction.parser import parse_receipt


def test_parse_complete_receipt_into_contract_fields() -> None:
    result = parse_receipt(
        OCRResult(
            lines=(
                "PAYMENT TRANSFER RECEIPT",
                "Status: Successful",
                "Amount: NGN 25,000.00",
                "Transaction Reference: paypruf-demo-001",
                "Date: 2026-08-19",
                "Time: 17:42:00",
                "Sender: Chinedu Okafor",
                "Recipient: Tola Fashion",
                "Bank: Demo Bank",
                "Account: ****6789",
            ),
            scores=(0.98,) * 10,
        )
    )

    assert result.amount == Decimal("25000.00")
    assert result.currency == "NGN"
    assert result.reference == "PAYPRUF-DEMO-001"
    assert result.bank == "Demo Bank"
    assert result.transaction_date == date(2026, 8, 19)
    assert result.transaction_time == time(17, 42)
    assert result.sender_name == "Chinedu Okafor"
    assert result.recipient_name == "Tola Fashion"
    assert result.status_text == "Successful"
    assert result.account_hint == "ending 6789"
    assert result.confidence > 0.95
    assert result.as_dict()["amount"] == "25000.00"
    assert result.as_dict()["transaction_time"] == "17:42:00"


def test_missing_fields_reduce_confidence_without_inventing_evidence() -> None:
    result = parse_receipt(OCRResult(lines=("Amount: NGN 15,000",), scores=(0.9,)))

    assert result.amount == Decimal("15000.00")
    assert result.reference is None
    assert result.sender_name is None
    assert result.confidence < 0.75


def test_normalizers_handle_contract_examples() -> None:
    assert parse_decimal("NGN 25,000.00") == Decimal("25000.00")
    assert parse_decimal("\u20a625,000") == Decimal("25000.00")
    assert normalize_reference(" paypruf _ demo - 001 ") == "PAYPRUF-DEMO-001"
    assert normalize_account_hint("Account number **** 6789") == "ending 6789"
