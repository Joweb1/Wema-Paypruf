"""Deterministic confidence scoring for normalized receipt fields.

Scores describe extraction quality only. They do not determine whether a
payment is genuine or matches a backend transaction.
"""

from __future__ import annotations

from typing import Any

from receipts.normalize import FIELD_NAMES


# Required transaction details contribute more to the overall extraction
# quality than descriptive fields that receipts may legitimately omit.
_FIELD_WEIGHTS = {
    "amount": 3.0,
    "currency": 2.0,
    "transaction_reference": 2.0,
    "transaction_date": 1.5,
    "transaction_time": 1.0,
    "sender_name": 1.0,
    "recipient_name": 1.0,
    "sender_account": 1.5,
    "recipient_account": 1.5,
    "bank_name": 1.0,
    "transaction_type": 1.0,
    "narration": 0.5,
}

_VALID_SCORE = 0.95
_UNVALIDATED_PRESENT_SCORE = 0.75
_INVALID_SCORE = 0.20
_MISSING_SCORE = 0.0


def _score_field(
    field_name: str,
    value: Any,
    validation: dict[str, Any],
) -> float:
    if value is None:
        return _MISSING_SCORE

    field_result = validation.get("field_results", {}).get(field_name)
    if isinstance(field_result, dict) and "valid" in field_result:
        return _VALID_SCORE if field_result["valid"] is True else _INVALID_SCORE

    # bank_name and narration are currently outside validate_fields. Their
    # presence is evidence of extraction, but not of structural validation.
    return _UNVALIDATED_PRESENT_SCORE


def calculate_confidence(fields: dict, validation: dict) -> dict:
    """Calculate per-field and overall extraction confidence.

    Missing values are scored as zero. Invalid supplied values receive a low
    score, while valid supplied values receive a high score. The function is
    defensive about malformed inputs and never mutates either argument.
    """
    source_fields = fields if isinstance(fields, dict) else {}
    source_validation = validation if isinstance(validation, dict) else {}

    scores = {
        field_name: _score_field(
            field_name,
            source_fields.get(field_name),
            source_validation,
        )
        for field_name in FIELD_NAMES
    }

    total_weight = sum(_FIELD_WEIGHTS.values())
    overall = sum(
        scores[field_name] * _FIELD_WEIGHTS[field_name]
        for field_name in FIELD_NAMES
    ) / total_weight

    return {
        "fields": scores,
        "overall_confidence": round(overall, 4),
    }