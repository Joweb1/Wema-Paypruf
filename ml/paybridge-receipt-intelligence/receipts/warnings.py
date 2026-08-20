"""Extraction-quality warnings for normalized receipt fields."""

from __future__ import annotations

from typing import Any


_REQUIRED_FIELDS = (
    ("amount", "Amount is missing."),
    (
        "transaction_reference",
        "Transaction reference could not be confidently extracted.",
    ),
    ("transaction_date", "Transaction date is missing."),
    ("transaction_time", "Transaction time is missing."),
)
_LOW_CONFIDENCE_THRESHOLD = 0.70


def _missing(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def generate_warnings(
    fields: dict,
    validation: dict,
    confidence: dict,
) -> list[str]:
    """Generate deterministic warnings about extraction quality only."""
    source_fields = fields if isinstance(fields, dict) else {}
    source_validation = validation if isinstance(validation, dict) else {}
    source_confidence = confidence if isinstance(confidence, dict) else {}
    warnings = []

    missing_required = []
    for field_name, message in _REQUIRED_FIELDS:
        if _missing(source_fields.get(field_name)):
            warnings.append(message)
            missing_required.append(field_name)

    sender_missing = _missing(source_fields.get("sender_name")) and _missing(
        source_fields.get("sender_account")
    )
    recipient_missing = _missing(source_fields.get("recipient_name")) and _missing(
        source_fields.get("recipient_account")
    )
    if sender_missing:
        warnings.append("Sender information is missing.")
    if recipient_missing:
        warnings.append("Recipient information is missing.")

    field_results = source_validation.get("field_results", {})
    if isinstance(field_results, dict):
        for field_name, result in field_results.items():
            if not isinstance(result, dict) or result.get("valid") is not False:
                continue
            warnings.append(f"{field_name} contains an invalid extracted value.")

    if missing_required or sender_missing or recipient_missing:
        warnings.append("Receipt information is incomplete.")

    overall_confidence = source_confidence.get("overall_confidence")
    if isinstance(overall_confidence, (int, float)) and not isinstance(
        overall_confidence,
        bool,
    ) and overall_confidence < _LOW_CONFIDENCE_THRESHOLD:
        warnings.append("Overall extraction confidence is low.")

    return warnings