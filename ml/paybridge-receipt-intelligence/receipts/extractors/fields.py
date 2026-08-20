"""Stage: Field extraction from raw OCR text.

Purpose: parse the raw text produced by `receipts.extractors.ocr.extract_text`
into the structured payment-claim fields the pipeline needs. This stage does
NOT determine payment validity, verification status, or genuineness — it only
extracts what the receipt CLAIMS.

Design goals (deterministic layer, no LLM call here):
  - deterministic  — same text in, same fields out, no randomness
  - fast / cheap   — pure regex + string parsing, no network calls
  - explainable    — every value traces back to a label or clear pattern
  - conservative   — a field is `None` unless there is real evidence for it

This module intentionally does NOT normalize values into their final types
beyond what's needed to satisfy the field's basic shape (e.g. amount becomes
a float because there's no other sane representation for "the number that
was extracted"). Date/time strings are returned as extracted, not converted
to ISO — that's Phase 5 (normalization). Confidence scoring and warnings are
also out of scope here (Phase 6).
"""

from __future__ import annotations

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Shared parsing helpers
# ---------------------------------------------------------------------------

# Matches a "Label: value" or "Label - value" line. Label is letters/spaces
# only (receipt labels are always words, never digits), value is everything
# after the separator on that line.
_LABEL_VALUE_RE = re.compile(r"^\s*(?P<label>[A-Za-z][A-Za-z /]*?)\s*[:\-]\s*(?P<value>.+?)\s*$")


def _label_value_lines(raw_text: str):
    """Yield (label_lower, value_stripped) for every "Label: value" line."""
    for line in raw_text.splitlines():
        match = _LABEL_VALUE_RE.match(line)
        if not match:
            continue
        label = match.group("label").strip().lower()
        value = match.group("value").strip()
        if not value:
            continue
        yield label, value


def _label_matches(label: str, keywords: tuple[str, ...]) -> bool:
    """True if `label` contains one of `keywords` as a whole word/phrase."""
    return any(keyword in label for keyword in keywords)


# ---------------------------------------------------------------------------
# Amount + currency
# ---------------------------------------------------------------------------

_AMOUNT_LABEL_KEYWORDS = ("amount", "amt")
_AMOUNT_EXCLUDE_KEYWORDS = (
    "fee",
    "charge",
    "balance",
    "vat",
    "commission",
    "levy",
    "stamp duty",
    "available",
)

# Money value: comma-grouped ("50,000.00") or plain decimal/integer ("50000").
_MONEY_VALUE_RE = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?")
_CURRENCY_SIGNAL_RE = re.compile(r"₦|\bNGN\b|\bnaira\b", re.IGNORECASE)


def _parse_money(value: str) -> Optional[float]:
    match = _MONEY_VALUE_RE.search(value)
    if not match:
        return None
    try:
        return float(match.group(0).replace(",", ""))
    except ValueError:
        return None


def _extract_amount(raw_text: str) -> tuple[Optional[float], Optional[str]]:
    """Return (amount, currency). Never picks fee/charge/balance lines."""
    candidate_line: Optional[str] = None

    for label, value in _label_value_lines(raw_text):
        if _label_matches(label, _AMOUNT_EXCLUDE_KEYWORDS):
            continue
        if _label_matches(label, _AMOUNT_LABEL_KEYWORDS):
            candidate_line = value
            break  # a labeled "Amount" line is the strongest possible signal

    if candidate_line is None:
        # Fallback: a bare money-looking value with no label at all, but only
        # when the entire line is (money-looking) — avoids grabbing digits
        # embedded in account/phone/reference numbers elsewhere in the text.
        for line in raw_text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if _label_matches(stripped.lower(), _AMOUNT_EXCLUDE_KEYWORDS):
                continue
            bare = stripped.lstrip("₦").strip()
            bare = re.sub(r"(?i)^ngn\s*", "", bare).strip()
            if _MONEY_VALUE_RE.fullmatch(bare):
                candidate_line = stripped
                break

    if candidate_line is None:
        return None, None

    amount = _parse_money(candidate_line)
    if amount is None:
        return None, None

    currency = "NGN" if _CURRENCY_SIGNAL_RE.search(candidate_line) else None
    if currency is None and _CURRENCY_SIGNAL_RE.search(raw_text):
        # The receipt is clearly NGN-denominated elsewhere (e.g. a ₦ symbol
        # on the balance line) even though the amount line itself was bare.
        currency = "NGN"

    return amount, currency


# ---------------------------------------------------------------------------
# Transaction reference
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Transaction reference
# ---------------------------------------------------------------------------

_REFERENCE_LABEL_KEYWORDS = (
    "transaction reference",
    "transaction ref",
    "transaction id",
    "transaction number",
    "transaction no",
    "payment reference",
    "payment id",
    "session id",
    "reference",
)

_REFERENCE_VALUE_RE = re.compile(r"^[A-Za-z0-9\-/]+$")
_PHONE_RE = re.compile(r"^0\d{10}$")
_DATE_LOOKING_RE = re.compile(r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$")
 

def _extract_reference(raw_text: str) -> Optional[str]:
    for label, value in _label_value_lines(raw_text):
        if not _label_matches(label, _REFERENCE_LABEL_KEYWORDS):
            continue

        candidate = value.split()[0] if value.split() else value

        if not _REFERENCE_VALUE_RE.match(candidate):
            continue

        if _PHONE_RE.match(candidate) or _DATE_LOOKING_RE.match(candidate):
            continue

        return candidate

    # Fallback for receipts where OCR produces:
    #
    # Transaction No.
    # 260819010100985732227170
    #
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    for i, line in enumerate(lines):
        normalized = line.lower().rstrip(".")

        if any(
            keyword in normalized
            for keyword in (
                "transaction no",
                "transaction number",
                "transaction reference",
                "payment reference",
                "reference",
            )
        ):
            if i + 1 < len(lines):
                candidate = lines[i + 1].strip()

                if (
                    _REFERENCE_VALUE_RE.fullmatch(candidate)
                    and not _PHONE_RE.fullmatch(candidate)
                    and not _DATE_LOOKING_RE.fullmatch(candidate)
                ):
                    return candidate

    return None

# ---------------------------------------------------------------------------
# Date
# ---------------------------------------------------------------------------

_DATE_LABEL_KEYWORDS = ("date",)

_MONTH_NAMES = (
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
)
_DATE_PATTERNS = [
    re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b"),
    re.compile(
        rf"\b\d{{1,2}}\s+(?:{_MONTH_NAMES})\s+\d{{4}}\b",
        re.IGNORECASE,
    ),
    re.compile(
        rf"\b(?:{_MONTH_NAMES})\s+\d{{1,2}}(?:st|nd|rd|th)?[,]?\s+\d{{4}}\b",
        re.IGNORECASE,
    ),
]

def _find_date_in(text: str) -> Optional[str]:
    for pattern in _DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(0)
    return None


def _extract_date(raw_text: str) -> Optional[str]:
    for label, value in _label_value_lines(raw_text):
        if not _label_matches(label, _DATE_LABEL_KEYWORDS):
            continue
        found = _find_date_in(value)
        if found:
            return found

    # Fallback: first date-looking pattern anywhere in the text.
    return _find_date_in(raw_text)


# ---------------------------------------------------------------------------
# Time
# ---------------------------------------------------------------------------

_TIME_LABEL_KEYWORDS = ("time",)
_TIME_RE = re.compile(r"\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b")


def _find_time_in(text: str) -> Optional[str]:
    match = _TIME_RE.search(text)
    return match.group(0).strip() if match else None


def _extract_time(raw_text: str) -> Optional[str]:
    for label, value in _label_value_lines(raw_text):
        if not _label_matches(label, _TIME_LABEL_KEYWORDS):
            continue
        found = _find_time_in(value)
        if found:
            return found

    return _find_time_in(raw_text)


# ---------------------------------------------------------------------------
# Sender / recipient names + accounts
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Sender / recipient names + accounts
# ---------------------------------------------------------------------------

_SENDER_LABEL_KEYWORDS = (
    "sender",
    "sender details",
    "from",
    "payer",
    "customer",
)

_RECIPIENT_LABEL_KEYWORDS = (
    "recipient",
    "recipient details",
    "beneficiary",
    "to",
)

_ACCOUNT_KEYWORD = "account"

# Normal Nigerian 10-digit account
# OR masked account such as 816****235
_ACCOUNT_NUMBER_RE = re.compile(
    r"(?:\b\d{10}\b|\b\d{2,4}\*{2,6}\d{2,4}\b)"
)


def _is_account_value(value: str) -> bool:
    """Return True when a value looks like an account number."""
    cleaned = value.replace(" ", "")
    return bool(_ACCOUNT_NUMBER_RE.fullmatch(cleaned))


def _extract_account(value: str) -> Optional[str]:
    """Extract normal or masked Nigerian account number."""
    match = _ACCOUNT_NUMBER_RE.search(value.replace(" ", ""))
    return match.group(0) if match else None


def _looks_like_name(value: str) -> bool:
    """Basic check for a person's name."""
    value = value.strip()

    if not value:
        return False

    if _is_account_value(value):
        return False

    # Don't accidentally treat a reference/date/time as a name.
    if re.fullmatch(r"[\d:/\-.]+", value):
        return False

    # A person's name should contain letters.
    return bool(re.search(r"[A-Za-z]", value))


def _extract_names_and_accounts(raw_text: str) -> dict:
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    sender_account: Optional[str] = None
    recipient_account: Optional[str] = None

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    context: Optional[str] = None

    for i, line in enumerate(lines):
        lower = line.lower().strip().rstrip(":")

        # ---------------------------------------------------------------
        # Sender section
        # ---------------------------------------------------------------
        if lower == "sender details" or lower.startswith("sender details"):
            context = "sender"
            continue

        # ---------------------------------------------------------------
        # Recipient section
        # ---------------------------------------------------------------
        if lower == "recipient details" or lower.startswith("recipient details"):
            context = "recipient"
            continue

        # ---------------------------------------------------------------
        # Sender / recipient name
        # ---------------------------------------------------------------
        if context in ("sender", "recipient"):

            # If this is the bank/account line:
            #
            # OPay | 817****206
            #
            # extract the masked account separately.
            account_match = _ACCOUNT_NUMBER_RE.search(line.replace(" ", ""))

            if account_match:
                account = account_match.group(0)

                if context == "sender" and sender_account is None:
                    sender_account = account

                elif context == "recipient" and recipient_account is None:
                    recipient_account = account

                # Do NOT use "OPay | account" as the person's name.
                continue

            # Otherwise this is probably the person's name.
            if _looks_like_name(line):
                if context == "sender" and sender_name is None:
                    sender_name = line

                elif context == "recipient" and recipient_name is None:
                    recipient_name = line

    return {
        "sender_name": sender_name,
        "recipient_name": recipient_name,
        "sender_account": sender_account,
        "recipient_account": recipient_account,
    }
# ---------------------------------------------------------------------------
# Bank
# ---------------------------------------------------------------------------

_BANK_LABEL_KEYWORDS = ("bank",)

# Well-known Nigerian bank / fintech names to recognize even when unlabeled.
# This is recognition of an explicit, already-printed name — never inference
# from receipt "look and feel".
_KNOWN_BANKS = (
    "wema bank",
    "guaranty trust bank",
    "gtbank",
    "gt bank",
    "access bank",
    "zenith bank",
    "first bank",
    "united bank for africa",
    "uba",
    "union bank",
    "fidelity bank",
    "sterling bank",
    "polaris bank",
    "ecobank",
    "fcmb",
    "first city monument bank",
    "stanbic ibtc",
    "kuda bank",
    "kuda",
    "opay",
    "moniepoint",
    "palmpay",
    "providus bank",
    "keystone bank",
    "citibank",
    "heritage bank",
    "jaiz bank",
    "unity bank",
    "suntrust bank",
)


def _extract_bank(raw_text: str) -> Optional[str]:
    for label, value in _label_value_lines(raw_text):
        if _label_matches(label, _BANK_LABEL_KEYWORDS):
            return value

    lowered = raw_text.lower()
    for bank in _KNOWN_BANKS:
        idx = lowered.find(bank)
        if idx != -1:
            return raw_text[idx : idx + len(bank)].strip()

    return None


# ---------------------------------------------------------------------------
# Transaction type
# ---------------------------------------------------------------------------

_TX_TYPE_LABEL_KEYWORDS = ("transaction type", "type")
_KNOWN_TX_TYPES = ("TRANSFER", "PAYMENT", "DEBIT", "CREDIT", "WITHDRAWAL", "DEPOSIT")


def _extract_transaction_type(raw_text: str) -> Optional[str]:
    for label, value in _label_value_lines(raw_text):
        if not _label_matches(label, _TX_TYPE_LABEL_KEYWORDS):
            continue
        upper = value.strip().upper()
        if upper in _KNOWN_TX_TYPES:
            return upper

    for line in raw_text.splitlines():
        upper = line.strip().upper()
        if upper in _KNOWN_TX_TYPES:
            return upper

    return None


# ---------------------------------------------------------------------------
# Narration
# ---------------------------------------------------------------------------

_NARRATION_LABEL_KEYWORDS = ("narration", "description", "remark", "note", "purpose")


def _extract_narration(raw_text: str) -> Optional[str]:
    for label, value in _label_value_lines(raw_text):
        if _label_matches(label, _NARRATION_LABEL_KEYWORDS):
            return value
    return None


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

_FIELD_KEYS = (
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


def extract_fields(raw_text: str) -> dict:
    """Parse raw OCR text into structured payment-claim fields.

    Deterministic, regex/label based — no external calls. Any field with no
    reliable evidence in the text is `None`; nothing is guessed or invented.

    Does NOT normalize types beyond parsing (dates/times stay as extracted
    text) and does NOT compute confidence or warnings — those are later
    pipeline phases.
    """
    if not raw_text or not raw_text.strip():
        return {key: None for key in _FIELD_KEYS}

    amount, currency = _extract_amount(raw_text)
    names_and_accounts = _extract_names_and_accounts(raw_text)

    return {
        "amount": amount,
        "currency": currency,
        "transaction_reference": _extract_reference(raw_text),
        "transaction_date": _extract_date(raw_text),
        "transaction_time": _extract_time(raw_text),
        "sender_name": names_and_accounts["sender_name"],
        "recipient_name": names_and_accounts["recipient_name"],
        "sender_account": names_and_accounts["sender_account"],
        "recipient_account": names_and_accounts["recipient_account"],
        "bank_name": _extract_bank(raw_text),
        "transaction_type": _extract_transaction_type(raw_text),
        "narration": _extract_narration(raw_text),
    }