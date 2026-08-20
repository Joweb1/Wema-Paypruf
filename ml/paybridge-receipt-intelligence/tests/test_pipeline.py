from types import SimpleNamespace

from receipts.exceptions import ImageValidationError
from receipts.pipeline import process_receipt


RAW_FIELDS = {
    "amount": 50000.0,
    "currency": "NGN",
    "transaction_reference": "WEMA123456",
    "transaction_date": "18/08/2026",
    "transaction_time": "14:32",
    "sender_name": "Jane Doe",
    "recipient_name": "Nana Store",
    "sender_account": "0123456789",
    "recipient_account": "0987654321",
    "bank_name": "Wema Bank",
    "transaction_type": "TRANSFER",
    "narration": "Payment for goods",
}


def _settings():
    return SimpleNamespace(
        max_file_mb=8,
        max_dimension=3000,
        hard_dimension_cap=12000,
        model="test-model",
    )


def test_process_receipt_orchestrates_all_stages(monkeypatch):
    calls = []

    monkeypatch.setattr("receipts.pipeline.load_settings", _settings)
    monkeypatch.setattr(
        "receipts.pipeline.validate_image",
        lambda image, **kwargs: calls.append(("validate", image, kwargs)) or "validated",
    )
    monkeypatch.setattr(
        "receipts.pipeline.prepare",
        lambda image, **kwargs: calls.append(("prepare", image, kwargs)) or b"prepared",
    )
    monkeypatch.setattr(
        "receipts.pipeline.extract_text",
        lambda image, **kwargs: calls.append(("ocr", image, kwargs)) or "raw receipt",
    )
    monkeypatch.setattr(
        "receipts.pipeline.extract_fields",
        lambda text: calls.append(("extract", text)) or RAW_FIELDS,
    )

    result = process_receipt(b"image", filename="receipt.png")

    assert result["success"] is True
    assert result["fields"]["amount"] == 50000.0
    assert result["validation"]["valid"] is True
    assert result["confidence"]["overall_confidence"] > 0.85
    assert result["warnings"] == []
    assert [call[0] for call in calls] == [
        "validate",
        "prepare",
        "ocr",
        "extract",
    ]


def test_process_receipt_returns_structured_validation_warnings(monkeypatch):
    monkeypatch.setattr("receipts.pipeline.load_settings", _settings)
    monkeypatch.setattr("receipts.pipeline.validate_image", lambda *args, **kwargs: "validated")
    monkeypatch.setattr("receipts.pipeline.prepare", lambda *args, **kwargs: b"prepared")
    monkeypatch.setattr("receipts.pipeline.extract_text", lambda *args, **kwargs: "raw")
    monkeypatch.setattr(
        "receipts.pipeline.extract_fields",
        lambda text: {"amount": -1},
    )

    result = process_receipt(b"image")

    assert result["success"] is True
    assert result["validation"]["valid"] is False
    assert any("amount" in warning.lower() for warning in result["warnings"])


def test_process_receipt_handles_image_validation_failure(monkeypatch):
    monkeypatch.setattr("receipts.pipeline.load_settings", _settings)
    monkeypatch.setattr(
        "receipts.pipeline.validate_image",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            ImageValidationError("No image data received.", code="INVALID_IMAGE")
        ),
    )

    result = process_receipt(b"")

    assert result == {
        "success": False,
        "error": "No image data received.",
        "code": "INVALID_IMAGE",
    }


def test_process_receipt_does_not_call_later_stages_after_validation_failure(monkeypatch):
    monkeypatch.setattr("receipts.pipeline.load_settings", _settings)
    monkeypatch.setattr(
        "receipts.pipeline.validate_image",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            ImageValidationError("invalid", code="INVALID_IMAGE")
        ),
    )
    prepare_called = False

    def fail_if_called(*args, **kwargs):
        nonlocal prepare_called
        prepare_called = True

    monkeypatch.setattr("receipts.pipeline.prepare", fail_if_called)

    process_receipt(b"bad")

    assert prepare_called is False