"""Typed values exchanged by the extraction pipeline."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, time
from decimal import Decimal
from typing import Any


@dataclass(frozen=True, slots=True)
class OCRResult:
    """Provider-neutral OCR text and per-line confidence scores."""

    lines: tuple[str, ...]
    scores: tuple[float, ...]


@dataclass(frozen=True, slots=True)
class ExtractedReceipt:
    """Structured receipt evidence matching ``docs/API_CONTRACT.md`` fields.

    Money and temporal values remain strongly typed internally. ``as_dict``
    serializes them into the contract's decimal-string and ISO formats.
    """

    amount: Decimal | None
    currency: str | None
    reference: str | None
    bank: str | None
    transaction_date: date | None
    transaction_time: time | None
    sender_name: str | None
    recipient_name: str | None
    status_text: str | None
    account_hint: str | None
    confidence: float
    raw_text: str

    def as_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["amount"] = format(self.amount, ".2f") if self.amount is not None else None
        value["transaction_date"] = (
            self.transaction_date.isoformat() if self.transaction_date is not None else None
        )
        value["transaction_time"] = (
            self.transaction_time.isoformat() if self.transaction_time is not None else None
        )
        value["confidence"] = round(self.confidence, 4)
        return value

    def to_contract_dict(self) -> dict[str, Any]:
        """Alias that makes the API-bound serialization intent explicit."""

        return self.as_dict()
