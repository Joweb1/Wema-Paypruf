"""Deterministic field parsing over provider-neutral OCR output."""

from __future__ import annotations

import re
from datetime import date, datetime, time
from decimal import Decimal

from .models import ExtractedReceipt, OCRResult
from .normalization import (
    clean_field,
    normalize_account_hint,
    normalize_reference,
    normalize_text,
    parse_decimal,
)

_LABEL_VALUE = re.compile(r"^\s*{labels}\s*[:\-]?\s*(.+?)\s*$", re.IGNORECASE)
_AMOUNT_LABEL = re.compile(
    r"\b(?:transaction\s+amount|amount(?:\s+paid)?|total(?:\s+paid)?|paid)\b"
    r"\s*[:\-]?\s*(?:NGN|NAIRA|N|\u20a6)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    re.IGNORECASE,
)
_CURRENCY_AMOUNT = re.compile(
    r"(?:NGN|NAIRA|\u20a6)\s*[:\-]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    re.IGNORECASE,
)
_DATE_TOKEN = re.compile(
    r"\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|"
    r"\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b"
)
_TIME_TOKEN = re.compile(r"\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\b", re.IGNORECASE)


def _labeled(lines: list[str], labels: str) -> str | None:
    pattern = re.compile(_LABEL_VALUE.pattern.format(labels=labels), re.IGNORECASE)
    for line in lines:
        match = pattern.match(line)
        if match:
            return clean_field(match.group(1))
    return None


def _parse_amount(lines: list[str]) -> Decimal | None:
    for pattern in (_AMOUNT_LABEL, _CURRENCY_AMOUNT):
        for line in lines:
            match = pattern.search(line)
            if match:
                value = parse_decimal(match.group(1))
                if value is not None:
                    return value
    return None


def _parse_date(lines: list[str]) -> date | None:
    labelled = _labeled(lines, r"(?:transaction\s+)?date")
    candidates = [labelled] if labelled else []
    candidates.extend(match.group(1) for line in lines for match in _DATE_TOKEN.finditer(line))
    formats = (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%d-%m-%y",
        "%d %b %Y",
        "%d %B %Y",
    )
    for candidate in candidates:
        if not candidate:
            continue
        candidate = candidate.strip()
        for fmt in formats:
            try:
                return datetime.strptime(candidate, fmt).date()  # noqa: DTZ007 -- date only
            except ValueError:
                pass
    return None


def _parse_time(lines: list[str]) -> time | None:
    labelled = _labeled(lines, r"(?:transaction\s+)?time")
    candidates = [labelled] if labelled else []
    candidates.extend(match.group(1) for line in lines for match in _TIME_TOKEN.finditer(line))
    for candidate in candidates:
        if not candidate:
            continue
        candidate = re.sub(r"\s+", " ", candidate.strip().upper())
        for fmt in ("%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p"):
            try:
                return datetime.strptime(candidate, fmt).time()  # noqa: DTZ007 -- time only
            except ValueError:
                pass
    return None


def _reference(lines: list[str]) -> str | None:
    value = _labeled(lines, r"(?:transaction\s+)?(?:reference|ref(?:erence)?|transaction\s+id)")
    return normalize_reference(value) if value else None


def _currency(raw_text: str, amount: Decimal | None) -> str | None:
    if re.search(r"(?:\bNGN\b|\bNAIRA\b|\u20a6)", raw_text, re.IGNORECASE):
        return "NGN"
    return "NGN" if amount is not None else None


def _confidence(result: OCRResult, fields: dict[str, object | None]) -> float:
    scores = [max(0.0, min(float(score), 1.0)) for score in result.scores]
    ocr_quality = sum(scores) / len(scores) if scores else 0.0
    weights = {
        "amount": 0.20,
        "currency": 0.05,
        "reference": 0.20,
        "bank": 0.05,
        "transaction_date": 0.10,
        "transaction_time": 0.05,
        "sender_name": 0.10,
        "recipient_name": 0.10,
        "status_text": 0.10,
        "account_hint": 0.05,
    }
    coverage = sum(weight for key, weight in weights.items() if fields.get(key) is not None)
    return round(max(0.0, min(1.0, (0.65 * ocr_quality) + (0.35 * coverage))), 4)


def parse_receipt(result: OCRResult) -> ExtractedReceipt:
    """Parse receipt fields without making any payment-validity decision."""

    raw_text = normalize_text("\n".join(result.lines))
    lines = raw_text.splitlines()
    amount = _parse_amount(lines)
    fields: dict[str, object | None] = {
        "amount": amount,
        "currency": _currency(raw_text, amount),
        "reference": _reference(lines),
        "bank": _labeled(lines, r"(?:bank|provider|financial\s+institution)"),
        "transaction_date": _parse_date(lines),
        "transaction_time": _parse_time(lines),
        "sender_name": _labeled(lines, r"(?:sender|from|payer|account\s+holder)"),
        "recipient_name": _labeled(lines, r"(?:recipient|to|beneficiary|merchant)"),
        "status_text": _labeled(lines, r"(?:transaction\s+)?status"),
        "account_hint": None,
    }
    account_value = _labeled(lines, r"(?:recipient\s+)?account(?:\s+(?:number|no\.?))?")
    fields["account_hint"] = normalize_account_hint(account_value) if account_value else None

    return ExtractedReceipt(
        amount=fields["amount"],  # type: ignore[arg-type]
        currency=fields["currency"],  # type: ignore[arg-type]
        reference=fields["reference"],  # type: ignore[arg-type]
        bank=fields["bank"],  # type: ignore[arg-type]
        transaction_date=fields["transaction_date"],  # type: ignore[arg-type]
        transaction_time=fields["transaction_time"],  # type: ignore[arg-type]
        sender_name=fields["sender_name"],  # type: ignore[arg-type]
        recipient_name=fields["recipient_name"],  # type: ignore[arg-type]
        status_text=fields["status_text"],  # type: ignore[arg-type]
        account_hint=fields["account_hint"],  # type: ignore[arg-type]
        confidence=_confidence(result, fields),
        raw_text=raw_text,
    )
