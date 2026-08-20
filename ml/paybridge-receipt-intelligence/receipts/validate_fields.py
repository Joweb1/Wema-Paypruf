"""Structural validation for normalized receipt fields.

This module validates what a receipt claims. It does not determine whether
the claimed payment is genuine or matches a backend transaction.
"""

from __future__ import annotations

import math
import re
from datetime import datetime
from typing import Any


_KNOWN_CURRENCIES = {"NGN"}
_KNOWN_TRANSACTION_TYPES = {
    "TRANSFER",
    "PAYMENT",
    "DEBIT",
    "CREDIT",
    "WITHDRAWAL",
    "DEPOSIT",
}

# Supports both:
# 8171234567       -> full 10-digit account
# 817****206       -> masked account shown on receipts
_ACCOUNT_NUMBER_RE = re.compile(r"^\d{10}$")
_MASKED_ACCOUNT_RE = re.compile(r"^\d{3}\*{4}\d{3}$")

# Supports normalized ISO dates.
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Supports receipt dates such as:
# Aug 19th, 2026
# Aug 1st, 2026
# December 19th, 2026
_RECEIPT_DATE_RE = re.compile(
    r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
    r"(?:uary|ruary|ch|il|e|y|e|y|t|ember|ober|ember|ember)? "
    r"\d{1,2}(st|nd|rd|th), \d{4}$",
    re.IGNORECASE,
)

# Supports:
# 13:15
# 13:15:27
_TIME_RE = re.compile(r"^\d{2}:\d{2}(?::\d{2})?$")


def _valid_amount(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value >= 0
    )


def _valid_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False

    # Normalized ISO date
    if _DATE_RE.fullmatch(value):
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return True
        except ValueError:
            return False

    # Receipt-style date, e.g. "Aug 19th, 2026"
    if _RECEIPT_DATE_RE.fullmatch(value):
        date_without_ordinal = re.sub(
            r"(\d{1,2})(st|nd|rd|th)",
            r"\1",
            value,
            flags=re.IGNORECASE,
        )

        try:
            datetime.strptime(date_without_ordinal, "%b %d, %Y")
            return True
        except ValueError:
            return False

    return False


def _valid_time(value: Any) -> bool:
    if not isinstance(value, str) or not _TIME_RE.fullmatch(value):
        return False

    try:
        datetime.strptime(
            value,
            "%H:%M:%S" if len(value) == 8 else "%H:%M",
        )
    except ValueError:
        return False

    return True


def _valid_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _valid_account(value: Any) -> bool:
    if not isinstance(value, str):
        return False

    return bool(
        _ACCOUNT_NUMBER_RE.fullmatch(value)
        or _MASKED_ACCOUNT_RE.fullmatch(value)
    )


_VALIDATORS = {
    "amount": _valid_amount,
    "currency": lambda value: value in _KNOWN_CURRENCIES,
    "transaction_reference": _valid_non_empty_string,
    "transaction_date": _valid_date,
    "transaction_time": _valid_time,
    "sender_name": _valid_non_empty_string,
    "recipient_name": _valid_non_empty_string,
    "sender_account": _valid_account,
    "recipient_account": _valid_account,
    "transaction_type": lambda value: isinstance(value, str)
    and value.upper() in _KNOWN_TRANSACTION_TYPES,
}


def validate_fields(fields: dict) -> dict:
    """Validate normalized receipt fields without inventing missing values."""
    if not isinstance(fields, dict):
        fields = {}

    field_results = {}
    errors = []

    for field_name, validator in _VALIDATORS.items():
        value = fields.get(field_name)

        # Missing fields remain valid structurally.
        is_valid = value is None or validator(value)

        field_results[field_name] = {"valid": is_valid}

        if not is_valid:
            errors.append(f"{field_name} is invalid")

    return {
        "valid": not errors,
        "field_results": field_results,
        "errors": errors,
    }