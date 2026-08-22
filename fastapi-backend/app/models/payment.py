"""Payment, Receipt, Bank Transaction, and Verification models."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Payment(Base):
    """Payment request created by a merchant."""

    __tablename__ = "payments"

    id = Column(String(64), primary_key=True, default=lambda: f"pay_{uuid.uuid4().hex[:12]}")
    merchant_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(64), nullable=True)
    amount = Column(String(32), nullable=False)  # Decimal formatted string e.g. "25000.00"
    currency = Column(String(8), default="NGN", nullable=False)
    description = Column(Text, nullable=False, default="Payment request")
    order_note = Column(Text, nullable=True)
    reference = Column(String(64), unique=True, index=True, nullable=False)
    public_token = Column(String(64), unique=True, index=True, nullable=False)
    public_url = Column(String(255), nullable=False)
    status = Column(String(32), default="PENDING", nullable=False, index=True)  # PENDING, CONFIRMED, MISMATCH, NOT_RECEIVED
    status_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    merchant = relationship("User", back_populates="payments")
    receipt = relationship("Receipt", uselist=False, back_populates="payment", cascade="all, delete-orphan")
    transaction = relationship("BankTransaction", uselist=False, back_populates="payment", cascade="all, delete-orphan")
    verification = relationship("Verification", uselist=False, back_populates="payment", cascade="all, delete-orphan")

    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > expires

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "amount": self.amount,
            "currency": self.currency,
            "description": self.description,
            "order_note": self.order_note,
            "reference": self.reference,
            "public_token": self.public_token,
            "public_url": self.public_url,
            "status": self.status,
            "status_reason": self.status_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_expired": self.is_expired(),
            "receipt": self.receipt.to_dict() if self.receipt else None,
            "transaction": self.transaction.to_dict() if self.transaction else None,
            "verification": self.verification.to_dict() if self.verification else None,
        }


class Receipt(Base):
    """Customer uploaded receipt and OCR extraction details."""

    __tablename__ = "receipts"

    id = Column(String(64), primary_key=True, default=lambda: f"rec_{uuid.uuid4().hex[:12]}")
    payment_id = Column(String(64), ForeignKey("payments.id", ondelete="CASCADE"), unique=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, default=0, nullable=False)
    storage_path = Column(String(500), nullable=True)
    preview_url = Column(String(500), nullable=True)
    amount = Column(String(32), nullable=True)
    currency = Column(String(8), default="NGN", nullable=True)
    reference = Column(String(100), nullable=True)
    bank = Column(String(100), nullable=True)
    status_text = Column(String(100), default="Successful Transaction", nullable=True)
    sender_name = Column(String(255), nullable=True)
    recipient_name = Column(String(255), nullable=True)
    account_hint = Column(String(64), nullable=True)
    sender_account = Column(String(64), nullable=True)
    transaction_date = Column(DateTime(timezone=True), nullable=True)
    transaction_time = Column(String(32), nullable=True)
    confidence = Column(Float, default=0.95, nullable=False)
    raw_text = Column(Text, nullable=True)
    warnings_json = Column(Text, nullable=True)
    field_evidence_json = Column(Text, nullable=True)
    authenticity_indicators_json = Column(Text, nullable=True)
    missing_fields_json = Column(Text, nullable=True)
    backend_validation_status = Column(String(64), default="VALID_CLAIM", nullable=False)
    ai_engine = Column(String(32), default="GEMINI_VISION", nullable=False)
    ai_offline = Column(Boolean, default=False, nullable=False)
    ai_status_message = Column(String(255), nullable=True)
    originality_score = Column(Float, default=0.95, nullable=False)
    tampering_detected = Column(Boolean, default=False, nullable=False)
    authenticity_verdict = Column(String(32), default="GENUINE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    payment = relationship("Payment", back_populates="receipt")

    def to_dict(self) -> dict:
        fe = {}
        if self.field_evidence_json:
            try:
                fe = json.loads(self.field_evidence_json)
            except Exception:
                pass

        ai = {}
        if self.authenticity_indicators_json:
            try:
                ai = json.loads(self.authenticity_indicators_json)
            except Exception:
                pass

        mf = []
        if self.missing_fields_json:
            try:
                mf = json.loads(self.missing_fields_json)
            except Exception:
                pass

        return {
            "original_filename": self.original_filename,
            "mime_type": self.mime_type,
            "size_bytes": self.size_bytes,
            "preview_url": self.preview_url,
            "amount": self.amount,
            "currency": self.currency or "NGN",
            "reference": self.reference,
            "bank": self.bank,
            "status_text": self.status_text,
            "sender_name": self.sender_name,
            "recipient_name": self.recipient_name,
            "account_hint": self.account_hint,
            "sender_account": self.sender_account,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "transaction_time": self.transaction_time,
            "confidence": self.confidence,
            "originality_score": self.originality_score,
            "tampering_detected": self.tampering_detected,
            "authenticity_verdict": self.authenticity_verdict,
            "raw_text": self.raw_text,
            "field_evidence": fe,
            "authenticity_indicators": ai,
            "missing_fields": mf,
            "backend_validation_status": self.backend_validation_status,
            "ai_engine": self.ai_engine,
            "ai_offline": self.ai_offline,
            "ai_status_message": self.ai_status_message,
        }


class BankTransaction(Base):
    """Simulated Wema NIP Bank Ledger Transaction."""

    __tablename__ = "bank_transactions"

    id = Column(String(64), primary_key=True, default=lambda: f"btx_{uuid.uuid4().hex[:12]}")
    payment_id = Column(String(64), ForeignKey("payments.id", ondelete="CASCADE"), unique=True, nullable=False)
    provider = Column(String(64), default="WEMA_NIP", nullable=False)
    provider_reference = Column(String(100), nullable=False)
    payment_reference = Column(String(64), nullable=False)
    amount = Column(String(32), nullable=False)
    currency = Column(String(8), default="NGN", nullable=False)
    status = Column(String(32), default="SUCCESS", nullable=False)
    sender_name = Column(String(255), nullable=True)
    recipient_account_hint = Column(String(64), nullable=True)
    transaction_date = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    payment = relationship("Payment", back_populates="transaction")

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "provider_reference": self.provider_reference,
            "payment_reference": self.payment_reference,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "sender_name": self.sender_name,
            "recipient_account_hint": self.recipient_account_hint,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
        }


class Verification(Base):
    """Automated reconciliation record and comparison matrix."""

    __tablename__ = "verifications"

    id = Column(String(64), primary_key=True, default=lambda: f"ver_{uuid.uuid4().hex[:12]}")
    payment_id = Column(String(64), ForeignKey("payments.id", ondelete="CASCADE"), unique=True, nullable=False)
    status = Column(String(32), nullable=False)  # CONFIRMED, PENDING, MISMATCH, NOT_RECEIVED
    reason_code = Column(String(64), nullable=False)
    reason = Column(Text, nullable=False)
    verified_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    amount_match = Column(Boolean, default=True, nullable=False)
    reference_match = Column(Boolean, default=True, nullable=False)
    currency_match = Column(Boolean, default=True, nullable=False)
    merchant_match = Column(Boolean, default=True, nullable=False)
    date_match = Column(Boolean, default=True, nullable=False)
    comparison_json = Column(Text, nullable=True)
    timeline_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    payment = relationship("Payment", back_populates="verification")

    def to_dict(self) -> dict:
        comp = {}
        if self.comparison_json:
            try:
                comp = json.loads(self.comparison_json)
            except Exception:
                pass

        time_line = []
        if self.timeline_json:
            try:
                time_line = json.loads(self.timeline_json)
            except Exception:
                pass

        return {
            "payment_id": self.payment_id,
            "status": self.status,
            "reason_code": self.reason_code,
            "reason": self.reason,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "amount_match": self.amount_match,
            "reference_match": self.reference_match,
            "currency_match": self.currency_match,
            "merchant_match": self.merchant_match,
            "date_match": self.date_match,
            "comparison": comp,
            "timeline": time_line,
            "transaction": self.payment.transaction.to_dict() if self.payment and self.payment.transaction else None,
        }
