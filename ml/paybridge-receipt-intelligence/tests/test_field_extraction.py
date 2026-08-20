"""Tests for the field extraction layer.

All fixtures are realistic OCR-style raw text (the kind of thing
`receipts.extractors.ocr.extract_text` would return) rather than isolated
strings, so the tests exercise label/context matching the way it will
actually be used.

No external API calls are made anywhere in this file.
"""

from __future__ import annotations

from receipts.extractors import extract_fields

# ---------------------------------------------------------------------------
# 1 & 5-11: a full, realistic Wema-style transfer receipt
# ---------------------------------------------------------------------------

WEMA_RECEIPT = """
WEMA BANK
Transaction Receipt

Amount: ₦50,000.00
Fee: ₦10.00
Transaction Reference: WEMA123456
Transaction Date: 18/08/2026
Transaction Time: 14:32
Transaction Type: TRANSFER

Sender: Jane Doe
Sender Account: 0123456789

Recipient: Nana Store
Recipient Account: 0987654321

Narration: Payment for goods
"""


def test_full_receipt_extracts_all_fields():
    result = extract_fields(WEMA_RECEIPT)

    assert result["amount"] == 50000.0
    assert result["currency"] == "NGN"
    assert result["transaction_reference"] == "WEMA123456"
    assert result["transaction_date"] == "18/08/2026"
    assert result["transaction_time"] == "14:32"
    assert result["sender_name"] == "Jane Doe"
    assert result["recipient_name"] == "Nana Store"
    assert result["sender_account"] == "0123456789"
    assert result["recipient_account"] == "0987654321"
    assert result["bank_name"] == "WEMA BANK" or result["bank_name"].lower() == "wema bank"
    assert result["transaction_type"] == "TRANSFER"
    assert result["narration"] == "Payment for goods"


# ---------------------------------------------------------------------------
# 2: NGN-prefixed amount instead of ₦
# ---------------------------------------------------------------------------

NGN_PREFIX_RECEIPT = """
GTBank Alert
Amount: NGN 75,000.00
Reference: GTB998877
Date: 01/03/2026
"""


def test_ngn_prefixed_amount():
    result = extract_fields(NGN_PREFIX_RECEIPT)
    assert result["amount"] == 75000.0
    assert result["currency"] == "NGN"
    assert result["transaction_reference"] == "GTB998877"


# ---------------------------------------------------------------------------
# 3: amount must not be confused with balance
# ---------------------------------------------------------------------------

AMOUNT_VS_BALANCE_RECEIPT = """
Access Bank
Amount: ₦50,000
Available Balance: ₦120,000
"""


def test_amount_is_not_confused_with_balance():
    result = extract_fields(AMOUNT_VS_BALANCE_RECEIPT)
    assert result["amount"] == 50000.0


# ---------------------------------------------------------------------------
# 4: amount must not be confused with a transaction fee
# ---------------------------------------------------------------------------

AMOUNT_VS_FEE_RECEIPT = """
Zenith Bank
Amount: ₦50,000
Fee: ₦10
Balance: ₦120,000
"""


def test_amount_is_not_confused_with_fee():
    result = extract_fields(AMOUNT_VS_FEE_RECEIPT)
    assert result["amount"] == 50000.0
    assert result["amount"] != 10.0


# ---------------------------------------------------------------------------
# 6: alternate date formats
# ---------------------------------------------------------------------------

def test_date_format_day_month_name_year():
    text = "Bank Transfer\nDate: 18 Aug 2026\nAmount: ₦1,000"
    result = extract_fields(text)
    assert result["transaction_date"] == "18 Aug 2026"


def test_date_format_month_name_day_year():
    text = "Bank Transfer\nDate: Aug 18, 2026\nAmount: ₦1,000"
    result = extract_fields(text)
    assert result["transaction_date"] == "Aug 18, 2026"


# ---------------------------------------------------------------------------
# 7: alternate time formats
# ---------------------------------------------------------------------------

def test_time_format_with_am_pm():
    text = "Bank Transfer\nTime: 2:32 PM\nAmount: ₦1,000"
    result = extract_fields(text)
    assert result["transaction_time"] == "2:32 PM"


def test_time_format_with_seconds():
    text = "Bank Transfer\nTime: 14:32:45\nAmount: ₦1,000"
    result = extract_fields(text)
    assert result["transaction_time"] == "14:32:45"


# ---------------------------------------------------------------------------
# 8 & 9: sender / recipient using varied labels
# ---------------------------------------------------------------------------

def test_sender_recipient_alternate_labels():
    text = """
    From: John Smith
    To: Amaka Traders
    Amount: ₦2,500
    """
    result = extract_fields(text)
    assert result["sender_name"] == "John Smith"
    assert result["recipient_name"] == "Amaka Traders"


def test_sender_recipient_payer_beneficiary_labels():
    text = """
    Payer: Chidi Okeke
    Beneficiary: Blessing Stores
    Amount: ₦3,200
    """
    result = extract_fields(text)
    assert result["sender_name"] == "Chidi Okeke"
    assert result["recipient_name"] == "Blessing Stores"


# ---------------------------------------------------------------------------
# 10: account number extraction, distinguished from a phone number
# ---------------------------------------------------------------------------

def test_account_number_extracted_and_phone_number_ignored():
    text = """
    Recipient: Nana Store
    Recipient Account: 0987654321
    Recipient Phone: 08031234567
    Amount: ₦1,000
    """
    result = extract_fields(text)
    assert result["recipient_account"] == "0987654321"


def test_reference_is_not_confused_with_phone_number():
    text = """
    Reference: 08031234567
    Amount: ₦1,000
    """
    result = extract_fields(text)
    assert result["transaction_reference"] is None


# ---------------------------------------------------------------------------
# 11: bank name recognized without an explicit "Bank:" label
# ---------------------------------------------------------------------------

def test_bank_name_recognized_unlabeled():
    text = """
    Wema Bank
    Transfer Receipt
    Amount: ₦4,000
    """
    result = extract_fields(text)
    assert result["bank_name"] == "Wema Bank"


def test_bank_not_invented_when_absent():
    text = "Amount: ₦4,000\nReference: XYZ001"
    result = extract_fields(text)
    assert result["bank_name"] is None


# ---------------------------------------------------------------------------
# 12: fields legitimately missing from the receipt stay None
# ---------------------------------------------------------------------------

def test_missing_fields_are_none():
    text = "Amount: ₦4,000\n"
    result = extract_fields(text)
    assert result["transaction_reference"] is None
    assert result["transaction_date"] is None
    assert result["transaction_time"] is None
    assert result["sender_name"] is None
    assert result["recipient_name"] is None
    assert result["sender_account"] is None
    assert result["recipient_account"] is None
    assert result["bank_name"] is None
    assert result["transaction_type"] is None
    assert result["narration"] is None


# ---------------------------------------------------------------------------
# 13: empty OCR text
# ---------------------------------------------------------------------------

def test_empty_text_returns_all_none():
    result = extract_fields("")
    assert all(value is None for value in result.values())


def test_whitespace_only_text_returns_all_none():
    result = extract_fields("   \n\n   ")
    assert all(value is None for value in result.values())


# ---------------------------------------------------------------------------
# 14: malformed / garbage OCR text should not crash or invent data
# ---------------------------------------------------------------------------

def test_malformed_text_does_not_crash_and_invents_nothing():
    text = "%%%¤¤¤ garbled !!! §§ receipt scan noise 8317z##"
    result = extract_fields(text)

    # Should not raise, and should not fabricate structured fields from noise.
    assert result["amount"] is None
    assert result["transaction_reference"] is None
    assert result["bank_name"] is None


# ---------------------------------------------------------------------------
# Bare/unlabeled amount format support (no currency symbol, no label)
# ---------------------------------------------------------------------------

def test_bare_amount_with_comma_and_decimals():
    text = "Transfer Confirmation\n50,000.00\nRef: ABC123"
    result = extract_fields(text)
    assert result["amount"] == 50000.0


def test_bare_amount_plain_integer():
    text = "Transfer Confirmation\n50000\nRef: ABC123"
    result = extract_fields(text)
    assert result["amount"] == 50000.0


# ---------------------------------------------------------------------------
# Transaction type variants
# ---------------------------------------------------------------------------

def test_transaction_type_credit():
    text = "Type: CREDIT\nAmount: ₦8,000"
    result = extract_fields(text)
    assert result["transaction_type"] == "CREDIT"


def test_transaction_type_not_invented_when_absent():
    text = "Amount: ₦8,000\nReference: NOTYPE001"
    result = extract_fields(text)
    assert result["transaction_type"] is None