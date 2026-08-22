"""Pydantic schemas for Bank Verification and Reconciliation."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ComparisonSchema(BaseModel):
    """Side-by-side reconciliation comparison."""
    expected_amount: Optional[str] = None
    receipt_amount: Optional[str] = None
    received_amount: Optional[str] = None
    receipt_reference: Optional[str] = None
    transaction_reference: Optional[str] = None

    model_config = {"extra": "allow"}


class TimelineStep(BaseModel):
    """Audit log step in verification timeline."""
    title: str
    timestamp: str
    state: Optional[str] = "complete"  # complete | current | error

    model_config = {"extra": "allow"}


class TransactionSchema(BaseModel):
    """Wema Bank transaction details."""
    provider: Optional[str] = "WEMA_NIP"
    provider_reference: Optional[str] = None
    payment_reference: Optional[str] = None
    amount: Optional[str] = None
    currency: Optional[str] = "NGN"
    status: Optional[str] = "SUCCESS"
    sender_name: Optional[str] = None
    recipient_account_hint: Optional[str] = None
    transaction_date: Optional[str] = None

    model_config = {"extra": "allow"}


class VerificationResponse(BaseModel):
    """Reconciliation result returned to frontend."""
    payment_id: str
    status: str  # CONFIRMED | PENDING | MISMATCH | NOT_RECEIVED
    reason_code: str
    reason: str
    verified_at: Optional[str] = None
    amount_match: bool = True
    reference_match: bool = True
    currency_match: bool = True
    merchant_match: bool = True
    date_match: bool = True
    comparison: Optional[Dict[str, Any]] = None
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    transaction: Optional[Dict[str, Any]] = None

    model_config = {"extra": "allow"}
