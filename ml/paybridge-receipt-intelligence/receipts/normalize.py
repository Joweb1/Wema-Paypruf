from __future__ import annotations

import re
from datetime import datetime
from typing import Any


FIELD_NAMES = (
    "amount",
    "currency",
    "transaction_reference",
    "transaction_date",
    "transaction_time",
    "sender_name",
    "recipient_name",
    "sender_account",
    "recipient_account",
    "bank_name",
    "transaction_type",
    "narration",
)


def _clean_string(value: Any) -> str | None:
    """Clean a string value without changing its meaning."""
    if value is None:
        return None

    value = str(value).strip()
    value = re.sub(r"\s+", " ", value)

    return value or None


def _normalize_amount(value: Any) -> float | None:
    """Convert a monetary value to a float."""
    if value is None:
        return None

    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()

    if not text:
        return None

    # Remove currency symbols/codes and spaces.
    text = re.sub(r"(?i)\bNGN\b", "", text)
    text = re.sub(r"(?i)\bNAIRA\b", "", text)
    text = text.replace("₦", "")
    text = text.replace(",", "")
    text = text.strip()

    # Only accept a normal monetary number.
    if not re.fullmatch(r"\d+(?:\.\d+)?", text):
        return None

    try:
        return float(text)
    except ValueError:
        return None


def _normalize_currency(value: Any) -> str | None:
    """Normalize Nigerian currency representations to NGN."""
    if value is None:
        return None

    text = str(value).strip().lower()

    if text in {"₦", "ngn", "naira", "nigerian naira"}:
        return "NGN"

    return None


def _normalize_date(value: Any) -> str | None:
    """Normalize supported receipt dates to YYYY-MM-DD."""
    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    formats = (
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d %b %Y",
        "%d %B %Y",
        "%b %d, %Y",
        "%B %d, %Y",
    )

    for date_format in formats:
        try:
            parsed = datetime.strptime(text, date_format)
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return None


def _normalize_time(value: Any) -> str | None:
    """Normalize receipt times to HH:MM."""
    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    formats = (
        "%H:%M",
        "%H:%M:%S",
        "%I:%M %p",
        "%I:%M:%S %p",
    )

    for time_format in formats:
        try:
            parsed = datetime.strptime(text, time_format)
            return parsed.strftime("%H:%M")
        except ValueError:
            continue

    return None


def normalize_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize extracted receipt fields into the PayBridge format.

    This function only normalizes extracted information.
    It does not determine whether a payment is genuine.
    """
    normalized = {field: None for field in FIELD_NAMES}

    if not isinstance(fields, dict):
        return normalized

    normalized["amount"] = _normalize_amount(fields.get("amount"))
    normalized["currency"] = _normalize_currency(fields.get("currency"))
    normalized["transaction_date"] = _normalize_date(
        fields.get("transaction_date")
    )
    normalized["transaction_time"] = _normalize_time(
        fields.get("transaction_time")
    )

    string_fields = (
        "transaction_reference",
        "sender_name",
        "recipient_name",
        "sender_account",
        "recipient_account",
        "bank_name",
        "transaction_type",
        "narration",
    )

    for field in string_fields:
        normalized[field] = _clean_string(fields.get(field))

    return normalized