from __future__ import annotations

import re
import unicodedata
from datetime import UTC, date, datetime, time
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any

MONEY_QUANTUM = Decimal("0.01")


def decimal_to_minor(value: Any) -> int:
    if isinstance(value, str):
        cleaned = re.sub(r"[^0-9.\-]", "", value.replace(",", ""))
        value = cleaned
    try:
        amount = Decimal(str(value)).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError("Amount could not be normalized.") from exc
    if not amount.is_finite() or amount < 0:
        raise ValueError("Amount must be a finite non-negative value.")
    return int(amount * 100)


def minor_to_money(value: int | None) -> str | None:
    if value is None:
        return None
    return f"{Decimal(value) / 100:.2f}"


def normalize_reference(value: str | None) -> str | None:
    if not value:
        return None
    normalized = re.sub(r"[^A-Z0-9]", "", value.upper())
    return normalized or None


def normalize_name(value: str | None) -> str | None:
    if not value:
        return None
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^A-Z0-9]+", " ", ascii_value.upper()).strip()
    return re.sub(r"\s+", " ", normalized) or None


def normalize_currency(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.upper().strip()
    aliases = {"₦": "NGN", "NAIRA": "NGN", "N": "NGN"}
    return aliases.get(cleaned, cleaned)


def account_digits(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    return digits or None


def account_hint_matches(hint: str | None, account_number: str) -> bool | None:
    digits = account_digits(hint)
    if not digits:
        return None
    account = account_digits(account_number) or ""
    compare_length = min(len(digits), len(account), 10)
    if compare_length < 4:
        return None
    return digits[-compare_length:] == account[-compare_length:]


def names_compatible(candidate: str | None, expected: str | None) -> bool | None:
    left = normalize_name(candidate)
    right = normalize_name(expected)
    if not left or not right:
        return None
    return left == right or left in right or right in left


def parse_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for parser in (
        lambda item: date.fromisoformat(item),
        lambda item: datetime.strptime(item, "%d/%m/%Y").date(),  # noqa: DTZ007 -- date only
        lambda item: datetime.strptime(item, "%d-%m-%Y").date(),  # noqa: DTZ007 -- date only
    ):
        try:
            return parser(text)
        except ValueError:
            continue
    return None


def parse_time(value: Any) -> time | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.time().replace(tzinfo=None)
    if isinstance(value, time):
        return value.replace(tzinfo=None)
    text = str(value).strip()
    for pattern in ("%H:%M:%S", "%H:%M", "%I:%M %p"):
        try:
            return datetime.strptime(text, pattern).time()  # noqa: DTZ007 -- time only
        except ValueError:
            continue
    return None


def combine_receipt_datetime(receipt_date: date | None, receipt_time: time | None) -> datetime | None:
    if receipt_date is None:
        return None
    return datetime.combine(receipt_date, receipt_time or time.min, tzinfo=UTC)
