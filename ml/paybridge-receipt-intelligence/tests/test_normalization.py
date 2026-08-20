from receipts.normalize import normalize_fields


def test_normalize_naira_amount():
    result = normalize_fields({"amount": "₦50,000.00"})
    assert result["amount"] == 50000.0


def test_normalize_comma_amount():
    result = normalize_fields({"amount": "50,000.00"})
    assert result["amount"] == 50000.0


def test_normalize_ngn_amount():
    result = normalize_fields({"amount": "NGN 75,500.50"})
    assert result["amount"] == 75500.50


def test_normalize_currency():
    assert normalize_fields({"currency": "₦"})["currency"] == "NGN"
    assert normalize_fields({"currency": "NGN"})["currency"] == "NGN"
    assert normalize_fields({"currency": "Naira"})["currency"] == "NGN"


def test_normalize_slash_date():
    result = normalize_fields({"transaction_date": "18/08/2026"})
    assert result["transaction_date"] == "2026-08-18"


def test_normalize_dash_date():
    result = normalize_fields({"transaction_date": "18-08-2026"})
    assert result["transaction_date"] == "2026-08-18"


def test_normalize_month_date():
    result = normalize_fields({"transaction_date": "18 Aug 2026"})
    assert result["transaction_date"] == "2026-08-18"


def test_normalize_full_month_date():
    result = normalize_fields({"transaction_date": "18 August 2026"})
    assert result["transaction_date"] == "2026-08-18"


def test_normalize_us_style_date():
    result = normalize_fields({"transaction_date": "Aug 18, 2026"})
    assert result["transaction_date"] == "2026-08-18"


def test_normalize_24_hour_time():
    result = normalize_fields({"transaction_time": "14:32"})
    assert result["transaction_time"] == "14:32"


def test_normalize_time_with_seconds():
    result = normalize_fields({"transaction_time": "14:32:45"})
    assert result["transaction_time"] == "14:32"


def test_normalize_pm_time():
    result = normalize_fields({"transaction_time": "2:32 PM"})
    assert result["transaction_time"] == "14:32"


def test_normalize_am_time():
    result = normalize_fields({"transaction_time": "9:14 AM"})
    assert result["transaction_time"] == "09:14"


def test_clean_string_fields():
    result = normalize_fields({
        "sender_name": "   Jane    Doe   ",
        "recipient_name": " Nana   Store ",
        "transaction_reference": " WEMA123456 ",
    })

    assert result["sender_name"] == "Jane Doe"
    assert result["recipient_name"] == "Nana Store"
    assert result["transaction_reference"] == "WEMA123456"


def test_account_numbers_remain_strings():
    result = normalize_fields({
        "sender_account": "0123456789",
        "recipient_account": "0987654321",
    })

    assert result["sender_account"] == "0123456789"
    assert result["recipient_account"] == "0987654321"


def test_missing_fields_are_none():
    result = normalize_fields({})

    assert result["amount"] is None
    assert result["currency"] is None
    assert result["transaction_reference"] is None
    assert result["transaction_date"] is None
    assert result["transaction_time"] is None
    assert result["sender_name"] is None
    assert result["recipient_name"] is None


def test_invalid_date_returns_none():
    result = normalize_fields({"transaction_date": "not-a-date"})
    assert result["transaction_date"] is None


def test_invalid_time_returns_none():
    result = normalize_fields({"transaction_time": "25:99"})
    assert result["transaction_time"] is None


def test_invalid_amount_returns_none():
    result = normalize_fields({"amount": "not-money"})
    assert result["amount"] is None


def test_complete_receipt_normalization():
    fields = {
        "amount": "₦50,000.00",
        "currency": "₦",
        "transaction_reference": " WEMA123456 ",
        "transaction_date": "18/08/2026",
        "transaction_time": "2:32 PM",
        "sender_name": " Jane   Doe ",
        "recipient_name": " Nana   Store ",
        "sender_account": "0123456789",
        "recipient_account": "0987654321",
        "bank_name": " Wema Bank ",
        "transaction_type": " TRANSFER ",
        "narration": " Payment for goods ",
    }

    result = normalize_fields(fields)

    assert result == {
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