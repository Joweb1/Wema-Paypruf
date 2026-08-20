from __future__ import annotations

from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from backend.app.core.enums import PaymentStatus, ProviderStatus, WorkflowStage
from backend.app.core.time import utcnow


class Base(DeclarativeBase):
    pass


payment_status_enum = Enum(PaymentStatus, native_enum=False, validate_strings=True)
workflow_stage_enum = Enum(WorkflowStage, native_enum=False, validate_strings=True)
provider_status_enum = Enum(ProviderStatus, native_enum=False, validate_strings=True)


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    business_name: Mapped[str] = mapped_column(String(120), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    wema_account_name: Mapped[str] = mapped_column(String(120), nullable=False)
    wema_account_number: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    payments: Mapped[list[PaymentRequest]] = relationship(
        back_populates="merchant", cascade="all, delete-orphan"
    )
    transactions: Mapped[list[MerchantTransaction]] = relationship(
        back_populates="merchant", cascade="all, delete-orphan"
    )


class PaymentRequest(Base):
    __tablename__ = "payment_requests"
    __table_args__ = (
        Index("ix_payment_status_created", "status", "created_at"),
        Index("ix_payment_customer", "customer_name"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    merchant_id: Mapped[str] = mapped_column(
        ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_phone: Mapped[str | None] = mapped_column(String(32))
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="NGN", nullable=False)
    description: Mapped[str] = mapped_column(String(240), nullable=False)
    order_note: Mapped[str | None] = mapped_column(String(240))
    reference: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    public_token: Mapped[str] = mapped_column(String(96), nullable=False, unique=True, index=True)
    status: Mapped[PaymentStatus] = mapped_column(
        payment_status_enum, default=PaymentStatus.PENDING, nullable=False
    )
    stage: Mapped[WorkflowStage] = mapped_column(
        workflow_stage_enum, default=WorkflowStage.AWAITING_RECEIPT, nullable=False
    )
    status_reason: Mapped[str] = mapped_column(String(320), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    first_opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    merchant: Mapped[Merchant] = relationship(back_populates="payments")
    receipts: Mapped[list[Receipt]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )
    verification: Mapped[Verification | None] = relationship(
        back_populates="payment", cascade="all, delete-orphan", uselist=False
    )


class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = (
        UniqueConstraint("payment_id", "sha256", name="uq_receipt_payment_hash"),
        Index("ix_receipt_payment_created", "payment_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    payment_id: Mapped[str] = mapped_column(
        ForeignKey("payment_requests.id", ondelete="CASCADE"), nullable=False
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    amount_minor: Mapped[int | None] = mapped_column(Integer)
    currency: Mapped[str | None] = mapped_column(String(3))
    reference: Mapped[str | None] = mapped_column(String(120))
    bank: Mapped[str | None] = mapped_column(String(120))
    transaction_date: Mapped[date | None] = mapped_column(Date)
    transaction_time: Mapped[time | None] = mapped_column()
    sender_name: Mapped[str | None] = mapped_column(String(160))
    recipient_name: Mapped[str | None] = mapped_column(String(160))
    status_text: Mapped[str | None] = mapped_column(String(120))
    account_hint: Mapped[str | None] = mapped_column(String(80))
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    extraction_provider: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    payment: Mapped[PaymentRequest] = relationship(back_populates="receipts")


class MerchantTransaction(Base):
    __tablename__ = "merchant_transactions"
    __table_args__ = (
        UniqueConstraint("provider", "provider_reference", name="uq_provider_reference"),
        Index("ix_transaction_merchant_date", "merchant_id", "transaction_date"),
        Index("ix_transaction_payment_reference", "payment_reference"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    merchant_id: Mapped[str] = mapped_column(
        ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(40), default="WEMA_MOCK", nullable=False)
    provider_reference: Mapped[str] = mapped_column(String(120), nullable=False)
    payment_reference: Mapped[str | None] = mapped_column(String(32))
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="NGN", nullable=False)
    sender_name: Mapped[str | None] = mapped_column(String(160))
    recipient_account_hint: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[ProviderStatus] = mapped_column(provider_status_enum, nullable=False)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    raw_payload: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    claimed_by_payment_id: Mapped[str | None] = mapped_column(
        ForeignKey("payment_requests.id", ondelete="SET NULL"), unique=True
    )

    merchant: Mapped[Merchant] = relationship(back_populates="transactions")


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    payment_id: Mapped[str] = mapped_column(
        ForeignKey("payment_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    receipt_id: Mapped[str] = mapped_column(
        ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False
    )
    transaction_id: Mapped[str | None] = mapped_column(
        ForeignKey("merchant_transactions.id", ondelete="SET NULL")
    )
    status: Mapped[PaymentStatus] = mapped_column(payment_status_enum, nullable=False)
    reason_code: Mapped[str] = mapped_column(String(80), nullable=False)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    amount_match: Mapped[bool | None] = mapped_column(Boolean)
    reference_match: Mapped[bool | None] = mapped_column(Boolean)
    currency_match: Mapped[bool | None] = mapped_column(Boolean)
    merchant_match: Mapped[bool | None] = mapped_column(Boolean)
    date_match: Mapped[bool | None] = mapped_column(Boolean)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    payment: Mapped[PaymentRequest] = relationship(back_populates="verification")
    receipt: Mapped[Receipt] = relationship()
    transaction: Mapped[MerchantTransaction | None] = relationship()


class User(Base):
    """Authentication identity for a PayPruf merchant.

    A user registers with exactly one of email, phone, or a Wema account number.
    The merchant/business profile is kept separate in MerchantProfile so the
    authentication model can later support multiple businesses per account.
    """

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_user_email"),
        UniqueConstraint("phone", name="uq_user_phone"),
        UniqueConstraint("wema_account_number", name="uq_user_wema_account"),
        Index("ix_user_email", "email"),
        Index("ix_user_phone", "phone"),
        Index("ix_user_wema_account", "wema_account_number"),
        # At least one identifier must be present.
        CheckConstraint(
            "email IS NOT NULL OR phone IS NOT NULL OR wema_account_number IS NOT NULL",
            name="ck_user_has_identifier",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(32))
    wema_account_number: Mapped[str | None] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="merchant", nullable=False)
    merchant_onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    profile: Mapped[MerchantProfile | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )


class MerchantProfile(Base):
    """The PayPruf business profile owned by an authenticated user (1:1)."""

    __tablename__ = "merchant_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_profile_user"),
        Index("ix_profile_wema_account", "wema_account_number"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    wema_account_number: Mapped[str] = mapped_column(String(20), nullable=False)
    account_name: Mapped[str] = mapped_column(String(120), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(120))
    account_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="profile")

