"""User and Merchant Directory models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """Registered merchant / user record."""

    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=lambda: f"usr_{uuid.uuid4().hex[:12]}")
    full_name = Column(String(255), nullable=False, default="")
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(64), index=True, nullable=True)
    wema_account_number = Column(String(10), index=True, nullable=True)
    account_name = Column(String(255), nullable=True)
    business_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    merchant_onboarding_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    payments = relationship("Payment", back_populates="merchant", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "fullName": self.full_name,
            "email": self.email or "",
            "phone": self.phone or "",
            "wemaAccountNumber": self.wema_account_number or "",
            "accountName": self.account_name or self.full_name or "",
            "businessName": self.business_name or self.full_name or "",
            "merchantOnboardingCompleted": self.merchant_onboarding_completed,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class MerchantDirectory(Base):
    """Directory of known / verified commercial accounts."""

    __tablename__ = "merchants_directory"

    id = Column(String(64), primary_key=True, default=lambda: f"md_{uuid.uuid4().hex[:12]}")
    account_number = Column(String(10), unique=True, index=True, nullable=False)
    account_name = Column(String(255), nullable=False)
    business_name = Column(String(255), nullable=False)
    bank_name = Column(String(100), default="Wema Bank / ALAT", nullable=False)
    registered = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self) -> dict:
        return {
            "accountNumber": self.account_number,
            "accountName": self.account_name,
            "businessName": self.business_name,
            "bankName": self.bank_name,
            "registered": self.registered,
        }
