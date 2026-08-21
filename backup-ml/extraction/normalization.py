"""Conservative OCR and transaction-field normalization helpers."""

from __future__ import annotations

import re
import unicodedata
from decimal import Decimal, InvalidOperation

_SPACE_RE = re.compile(r"[\t\f\v ]+")
_REFERENCE_RE = re.compile(r"[^A-Z0-9-]+")


def normalize_text(value: str) -> str:
    """Normalize Unicode and whitespace without inventing missing characters."""

    value = unicodedata.normalize("NFKC", value)
    value = value.replace("\u00a0", " ").replace("\u2013", "-").replace("\u2014", "-")
    lines = [_SPACE_RE.sub(" ", line).strip() for line in value.splitlines()]
    return "\n".join(line for line in lines if line)


def clean_field(value: str) -> str | None:
    value = normalize_text(value).strip(" :-|\t")
    return value or None


def normalize_reference(value: str) -> str | None:
    value = normalize_text(value).upper().replace("_", "-")
    value = re.sub(r"\s*-\s*", "-", value)
    value = _REFERENCE_RE.sub("", value)
    return value.strip("-") or None


def parse_decimal(value: str) -> Decimal | None:
    cleaned = value.upper().replace("NGN", "").replace("NAIRA", "").replace("\u20a6", "")
    cleaned = cleaned.replace(",", "").replace(" ", "").strip(":")
    if not cleaned or not re.fullmatch(r"\d+(?:\.\d{1,2})?", cleaned):
        return None
    try:
        return Decimal(cleaned).quantize(Decimal("0.01"))
    except InvalidOperation:
        return None


def normalize_account_hint(value: str) -> str | None:
    match = re.search(r"(?:ending\s*)?(\d{4})\b", value, flags=re.IGNORECASE)
    if match:
        return f"ending {match.group(1)}"
    digits = re.sub(r"\D", "", value)
    return f"ending {digits[-4:]}" if len(digits) >= 4 else None
