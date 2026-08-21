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
    "transaction_type": "TRANSFER",
}


def test_completely_valid_receipt():
    result = validate_fields(VALID_FIELDS)

    assert result["valid"] is True
    assert result["errors"] == []
    assert all(item["valid"] for item in result["field_results"].values())


def test_missing_optional_fields_are_valid():
    result = validate_fields({"amount": 0, "currency": "NGN"})

    assert result["valid"] is True
    assert result["errors"] == []


def test_negative_amount_is_invalid():
    result = validate_fields({"amount": -1})

    assert result["valid"] is False
    assert result["field_results"]["amount"]["valid"] is False


def test_zero_amount_is_valid():
    assert validate_fields({"amount": 0})["valid"] is True


def test_invalid_currency_is_invalid():
    result = validate_fields({"currency": "USD"})

    assert result["valid"] is False
    assert result["field_results"]["currency"]["valid"] is False


def test_invalid_date_is_invalid():
    result = validate_fields({"transaction_date": "2026-02-30"})

    assert result["valid"] is False
    assert result["field_results"]["transaction_date"]["valid"] is False


def test_invalid_time_is_invalid():
    result = validate_fields({"transaction_time": "25:99"})

    assert result["valid"] is False
    assert result["field_results"]["transaction_time"]["valid"] is False


def test_invalid_account_number_is_invalid():
    result = validate_fields({"sender_account": "123456789"})

    assert result["valid"] is False
    assert result["field_results"]["sender_account"]["valid"] is False


def test_empty_name_is_invalid():
    result = validate_fields({"recipient_name": "   "})

    assert result["valid"] is False
    assert result["field_results"]["recipient_name"]["valid"] is False


def test_invalid_transaction_type_is_invalid():
    result = validate_fields({"transaction_type": "REFUND"})

    assert result["valid"] is False
    assert result["field_results"]["transaction_type"]["valid"] is False


def test_multiple_validation_errors_are_reported():
    result = validate_fields({
        "amount": -10,
        "currency": "USD",
        "transaction_time": "25:99",
        "recipient_account": "bad",
    })

    assert result["valid"] is False
    assert len(result["errors"]) == 4
    assert result["field_results"]["amount"]["valid"] is False
    assert result["field_results"]["currency"]["valid"] is False
    assert result["field_results"]["transaction_time"]["valid"] is False
    assert result["field_results"]["recipient_account"]["valid"] is False


def test_null_and_missing_fields_are_valid():
    result = validate_fields({
        "amount": None,
        "currency": None,
        "sender_name": None,
        "recipient_account": None,
    })

    assert result["valid"] is True
    assert result["errors"] == []