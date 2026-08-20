from receipts.confidence import calculate_confidence
from receipts.validate_fields import validate_fields


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


def score(fields):
    return calculate_confidence(fields, validate_fields(fields))


def test_completely_valid_receipt_gets_high_confidence():
    result = score(VALID_FIELDS)

    assert result["overall_confidence"] > 0.85
    assert result["fields"]["amount"] == 0.95
    assert result["fields"]["bank_name"] == 0.75


def test_missing_optional_fields_do_not_crash():
    result = score({"amount": 50000.0, "currency": "NGN"})

    assert result["fields"]["narration"] == 0.0
    assert 0.0 <= result["overall_confidence"] <= 1.0


def test_missing_important_fields_reduce_overall_confidence():
    complete = score(VALID_FIELDS)["overall_confidence"]
    missing_amount = score({
        key: value for key, value in VALID_FIELDS.items() if key != "amount"
    })["overall_confidence"]

    assert missing_amount < complete


def test_invalid_fields_reduce_confidence():
    result = score({**VALID_FIELDS, "amount": -1})

    assert result["fields"]["amount"] == 0.20
    assert result["overall_confidence"] < score(VALID_FIELDS)["overall_confidence"]


def test_none_values_are_handled_safely():
    result = score({"amount": None, "currency": None})

    assert result["fields"]["amount"] == 0.0
    assert result["fields"]["currency"] == 0.0


def test_all_field_scores_stay_between_zero_and_one():
    result = score(VALID_FIELDS)

    assert all(0.0 <= value <= 1.0 for value in result["fields"].values())


def test_overall_confidence_stays_between_zero_and_one():
    result = calculate_confidence({}, {})

    assert 0.0 <= result["overall_confidence"] <= 1.0


def test_empty_input_is_handled_safely():
    result = calculate_confidence({}, {})

    assert set(result["fields"]) == set(VALID_FIELDS)
    assert result["overall_confidence"] == 0.0


def test_confidence_is_deterministic():
    validation = validate_fields(VALID_FIELDS)

    assert calculate_confidence(VALID_FIELDS, validation) == calculate_confidence(
        VALID_FIELDS,
        validation,
    )


def test_no_payment_verification_decision_is_produced():
    result = score(VALID_FIELDS)

    assert set(result) == {"fields", "overall_confidence"}
    assert not any(
        key in result
        for key in ("REAL", "FAKE", "FRAUD", "CONFIRMED", "MISMATCH", "NOT_RECEIVED")
    )