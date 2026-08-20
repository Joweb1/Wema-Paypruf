from __future__ import annotations

import re

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
)


class ValidationError(Exception):
    """Raised for user-facing input validation problems (safe to surface)."""

    def __init__(self, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.field = field


def normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lower()
    if not EMAIL_PATTERN.match(cleaned):
        raise ValidationError("Enter a valid email address.", field="email")
    return cleaned


def normalize_phone(value: str | None) -> str | None:
    """Normalize a Nigerian phone number to +2348012345678 where possible."""
    if not value:
        return None
    raw = value.strip().replace(" ", "").replace("-", "")
    # Accept leading 00 or +, then the country code.
    if raw.startswith("00"):
        raw = "+" + raw[2:]
    digits = re.sub(r"\D", "", raw)
    if raw.startswith("+"):
        digits = re.sub(r"\D", "", raw)

    # Local 0-prefixed Nigerian number, e.g. 08012345678 or 8012345678.
    if digits.startswith("234") and len(digits) == 13:
        normalized = f"+{digits}"
    elif digits.startswith("0") and len(digits) == 11:
        normalized = f"+234{digits[1:]}"
    elif len(digits) == 10 and not digits.startswith("0"):
        # Already in 8012345678 form without the leading zero.
        normalized = f"+234{digits}"
    else:
        raise ValidationError(
            "Enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678.",
            field="phone",
        )
    if not re.fullmatch(r"\+234[789]\d{9}", normalized):
        raise ValidationError(
            "Enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678.",
            field="phone",
        )
    return normalized


def normalize_wema_account(value: str | None) -> str | None:
    """Wema account numbers are exactly 10 digits for the MVP."""
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    if len(digits) != 10:
        raise ValidationError(
            "The Wema account number must be exactly 10 digits.",
            field="wemaAccountNumber",
        )
    return digits


def validate_full_name(value: str | None) -> str:
    if not value:
        raise ValidationError("Enter your full name.", field="fullName")
    cleaned = value.strip()
    if not cleaned:
        raise ValidationError("Enter your full name.", field="fullName")
    if len(cleaned) > 120:
        raise ValidationError("That name is too long.", field="fullName")
    return cleaned


def validate_password_strength(value: str | None) -> str:
    if not value:
        raise ValidationError("Create a password.", field="password")
    if len(value) < 8:
        raise ValidationError(
            "Password must be at least 8 characters.", field="password"
        )
    if not PASSWORD_PATTERN.match(value):
        raise ValidationError(
            "Password must include an uppercase letter, a lowercase letter, and a number.",
            field="password",
        )
    return value


def validate_account_name(value: str | None) -> str:
    if not value:
        raise ValidationError("Enter the account name.", field="accountName")
    cleaned = value.strip()
    if not cleaned:
        raise ValidationError("Enter the account name.", field="accountName")
    if len(cleaned) > 120:
        raise ValidationError("That account name is too long.", field="accountName")
    return cleaned
