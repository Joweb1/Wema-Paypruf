from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.core.enums import (
    PaymentStatus,
    ProviderStatus,
    TimelineState,
    WorkflowStage,
)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


MoneyInput = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]


class PaymentCreate(StrictModel):
    customer_name: str = Field(min_length=1, max_length=120)
    customer_phone: str | None = Field(default=None, max_length=32)
    amount: MoneyInput
    description: str = Field(min_length=1, max_length=240)
    order_note: str | None = Field(default=None, max_length=240)
    expires_in_hours: int = Field(default=24, ge=1, le=168)

    @field_validator("customer_name", "description")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped

    @field_validator("customer_phone", "order_note")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class MerchantResponse(BaseModel):
    id: str
    business_name: str
    display_name: str
    phone: str | None
    wema_account_name: str
    wema_account_number: str | None
    wema_account_number_hint: str
    bank_name: str
    created_at: datetime


class PublicMerchantResponse(BaseModel):
    id: str
    business_name: str
    display_name: str
    phone: str | None = None
    wema_account_name: str
    wema_account_number: str | None = None
    wema_account_number_hint: str
    bank_name: str
    created_at: datetime


class PaymentInstructions(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    account_number_hint: str
    environment: str


class PaymentSummary(BaseModel):
    id: str
    customer_name: str
    customer_phone: str | None
    amount: str
    currency: str
    description: str
    order_note: str | None
    reference: str
    public_token: str
    public_url: str
    status: PaymentStatus
    stage: WorkflowStage
    status_reason: str
    expires_at: datetime
    is_expired: bool
    created_at: datetime
    updated_at: datetime


class PublicPaymentSummary(BaseModel):
    id: str
    customer_name: str
    amount: str
    currency: str
    description: str
    order_note: str | None
    reference: str
    public_url: str
    status: PaymentStatus
    stage: WorkflowStage
    status_reason: str
    expires_at: datetime
    is_expired: bool
    created_at: datetime
    updated_at: datetime


class ReceiptResponse(BaseModel):
    id: str
    original_filename: str
    mime_type: str
    size_bytes: int
    amount: str | None
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
    created_at: datetime
    extracted_at: datetime
    preview_url: str


class PublicReceiptResponse(BaseModel):
    id: str
    original_filename: str
    mime_type: str
    size_bytes: int
    amount: str | None
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
    created_at: datetime
    extracted_at: datetime
    preview_url: str


class MerchantTransactionResponse(BaseModel):
    id: str
    provider: str
    provider_reference: str
    payment_reference: str | None
    amount: str
    currency: str
    sender_name: str | None
    recipient_account_hint: str | None
    status: ProviderStatus
    transaction_date: datetime


class ComparisonResponse(BaseModel):
    expected_amount: str
    receipt_amount: str | None
    received_amount: str | None
    receipt_reference: str | None
    transaction_reference: str | None


class TimelineItem(BaseModel):
    key: str
    label: str
    timestamp: datetime | None
    state: TimelineState


class VerificationResponse(BaseModel):
    id: str
    payment_id: str
    status: PaymentStatus
    reason_code: str
    reason: str
    amount_match: bool | None
    reference_match: bool | None
    currency_match: bool | None
    merchant_match: bool | None
    date_match: bool | None
    verified_at: datetime
    receipt: PublicReceiptResponse
    transaction: MerchantTransactionResponse | None
    comparison: ComparisonResponse
    timeline: list[TimelineItem]


class PublicVerificationSummary(BaseModel):
    id: str
    payment_id: str
    status: PaymentStatus
    reason_code: str
    reason: str
    verified_at: datetime
    comparison: ComparisonResponse


class PaymentListResponse(BaseModel):
    items: list[PaymentSummary]
    total: int


class PaymentDetailResponse(BaseModel):
    payment: PaymentSummary
    merchant: MerchantResponse
    receipt: ReceiptResponse | None
    verification: VerificationResponse | None
    transaction: MerchantTransactionResponse | None
    timeline: list[TimelineItem]


class PublicPaymentDetailResponse(BaseModel):
    payment: PublicPaymentSummary
    merchant: PublicMerchantResponse
    payment_instructions: PaymentInstructions
    receipt: PublicReceiptResponse | None
    verification: VerificationResponse | None


class MerchantUploadResponse(BaseModel):
    payment: PaymentSummary
    receipt: ReceiptResponse


class PublicUploadResponse(BaseModel):
    payment: PublicPaymentSummary
    receipt: PublicReceiptResponse


class SummaryBucket(BaseModel):
    count: int
    value: str


class DashboardSummaryResponse(BaseModel):
    merchant: MerchantResponse
    total: SummaryBucket
    confirmed: SummaryBucket
    pending: SummaryBucket
    mismatch: SummaryBucket
    not_received: SummaryBucket
    recent_payments: list[PaymentSummary]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["ok"]
    wema_provider: Literal["mock"]
    ocr_provider: str


class AuthUserResponse(BaseModel):
    id: str
    fullName: str
    email: str | None
    phone: str | None
    wemaAccountNumber: str | None
    role: str
    merchantOnboardingCompleted: bool


class RegisterRequest(StrictModel):
    fullName: str = Field(min_length=1, max_length=120)
    method: str = Field(min_length=1, max_length=20)
    identifier: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=200)
    confirmPassword: str = Field(min_length=1, max_length=200)

    @field_validator("fullName", "identifier")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("method")
    @classmethod
    def normalize_method(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"email", "phone", "wema"}:
            raise ValueError("method must be email, phone, or wema")
        return normalized


class LoginRequest(StrictModel):
    identifier: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=200)

    @field_validator("identifier")
    @classmethod
    def strip_identifier(cls, value: str) -> str:
        return value.strip()


class OnboardingRequest(StrictModel):
    wemaAccountNumber: str = Field(min_length=1, max_length=20)
    accountName: str = Field(min_length=1, max_length=120)
    businessName: str | None = Field(default=None, max_length=120)

    @field_validator("accountName", "businessName")
    @classmethod
    def strip_names(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class MerchantProfileResponse(BaseModel):
    id: str
    userId: str
    wemaAccountNumber: str
    accountName: str
    businessName: str | None
    accountVerified: bool
    onboardingCompleted: bool
    createdAt: datetime
    updatedAt: datetime


class MerchantMeResponse(BaseModel):
    user: AuthUserResponse
    profile: MerchantProfileResponse | None


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any = None


class ErrorResponse(BaseModel):
    error: ErrorBody
