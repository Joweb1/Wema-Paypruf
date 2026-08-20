from receipts.confidence import calculate_confidence
from receipts.validate_fields import validate_fields
from receipts.warnings import generate_warnings


VALID_FIELDS = {
    "amount": 50000.0,
    "currency": "NGN",
    "transaction_reference": "WEMA123456",
    "transaction_date": "2026-08-18",
    "transaction_time": "14:32",
    "sender_name": "Jane Doe",
    "recipient_name": "Nana Store",
    "sender_account": "0123456789",
    "recipient_account": "0987654321",
    "bank_name": "Wema Bank",
    "transaction_type": "TRANSFER",
    "narration": "Payment for goods",
}


def warnings_for(fields):
    validation = validate_fields(fields)
    confidence = calculate_confidence(fields, validation)
    return generate_warnings(fields, validation, confidence)


def test_completely_valid_receipt_produces_no_warnings():
    assert warnings_for(VALID_FIELDS) == []


def test_missing_transaction_reference_produces_warning():
    warnings = warnings_for({**VALID_FIELDS, "transaction_reference": None})

    assert any("reference" in warning.lower() for warning in warnings)


def test_missing_amount_produces_warning():
    warnings = warnings_for({**VALID_FIELDS, "amount": None})

    assert "Amount is missing." in warnings


def test_missing_transaction_date_produces_warning():
    warnings = warnings_for({**VALID_FIELDS, "transaction_date": None})

    assert "Transaction date is missing." in warnings


def test_missing_transaction_time_produces_warning():
    warnings = warnings_for({**VALID_FIELDS, "transaction_time": None})

    assert "Transaction time is missing." in warnings


def test_invalid_field_produces_warning():
    fields = {**VALID_FIELDS, "amount": -1}

    assert any("amount" in warning.lower() and "invalid" in warning.lower()
               for warning in warnings_for(fields))


def test_low_overall_confidence_produces_warning():
    warnings = generate_warnings(VALID_FIELDS, {}, {"overall_confidence": 0.2})

    assert "Overall extraction confidence is low." in warnings


def test_missing_optional_fields_do_not_unnecessarily_warn():
    fields = {key: value for key, value in VALID_FIELDS.items()
              if key not in {"bank_name", "narration"}}

    assert warnings_for(fields) == []


def test_multiple_problems_produce_multiple_warnings():
    fields = {
        **VALID_FIELDS,
        "amount": None,
        "transaction_reference": None,
        "transaction_date": None,
    }
    warnings = warnings_for(fields)

    assert len(warnings) >= 4
    assert "Amount is missing." in warnings
    assert "Transaction date is missing." in warnings


def test_empty_input_is_handled_safely():
    warnings = generate_warnings({}, {}, {})

    assert isinstance(warnings, list)
    assert warnings


def test_warning_output_is_deterministic():
    validation = validate_fields(VALID_FIELDS)
    confidence = calculate_confidence(VALID_FIELDS, validation)

    assert generate_warnings(VALID_FIELDS, validation, confidence) == generate_warnings(
        VALID_FIELDS,
        validation,
        confidence,
    )


def test_warnings_never_contain_payment_verification_decisions():
    banned_terms = {
        "REAL",
        "FAKE",
        "FRAUD",
        "CONFIRMED",
        "MISMATCH",
        "NOT_RECEIVED",
    }
    warnings = warnings_for({"amount": -1, "currency": "USD"})

    assert not any(
        any(term in warning.upper() for term in banned_terms)
        for warning in warnings
    )