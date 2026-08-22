"""Pydantic schemas for Payment creation, listing, and dashboard summary."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.receipt import ReceiptResponse
from app.schemas.verification import TransactionSchema, VerificationResponse, TimelineStep


class PaymentCreate(BaseModel):
    """Payload to create a new payment request."""
    customer_name: str = Field(..., min_length=1)
    customer_phone: Optional[str] = None
    amount: str = Field(..., min_length=1)
    description: Optional[str] = "Payment request"
    order_note: Optional[str] = None
    currency: Optional[str] = "NGN"
    expires_in_hours: Optional[int] = 24


class PaymentResponse(BaseModel):
    """Payment object representation."""
    id: str
    merchant_id: str
    customer_name: str
    customer_phone: Optional[str] = None
    amount: str
    currency: str = "NGN"
    description: str
    order_note: Optional[str] = None
    reference: str
    public_token: str
    public_url: str
    status: str
    status_reason: Optional[str] = None
    created_at: Optional[str] = None
    expires_at: Optional[str] = None
    is_expired: bool = False
    receipt: Optional[ReceiptResponse] = None
    transaction: Optional[TransactionSchema] = None
    verification: Optional[VerificationResponse] = None


class PaymentDetailsResponse(BaseModel):
    """Complete payment details view for PaymentDetailsPage."""
    payment: PaymentResponse
    merchant: Dict[str, Any]
    receipt: Optional[ReceiptResponse] = None
    transaction: Optional[TransactionSchema] = None
    verification: Optional[VerificationResponse] = None
    timeline: List[TimelineStep] = []


class PublicPaymentResponse(BaseModel):
    """Public customer portal view for CustomerPaymentPage."""
    payment: PaymentResponse
    merchant: Dict[str, Any]
    payment_instructions: Dict[str, Any]
    receipt: Optional[ReceiptResponse] = None
    verification: Optional[VerificationResponse] = None


class MetricSummary(BaseModel):
    count: int
    value: float


class MerchantSummary(BaseModel):
    id: str
    display_name: str
    business_name: str
    wema_account_name: str
    wema_account_number_hint: str


class DashboardResponse(BaseModel):
    """Dashboard statistics and recent payments response."""
    merchant: MerchantSummary
    total: MetricSummary
    confirmed: MetricSummary
    pending: MetricSummary
    mismatch: MetricSummary
    not_received: MetricSummary
    recent_payments: List[PaymentResponse]
