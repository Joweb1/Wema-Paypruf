"""Fraud Report and Incident models for PayPruf Risk Intelligence."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class FraudReport(Base):
    """Aggregated fraud risk report for a merchant account."""

    __tablename__ = "fraud_reports"

    id = Column(String(64), primary_key=True, default=lambda: f"rep_{uuid.uuid4().hex[:12]}")
    account_number = Column(String(10), index=True, nullable=False)
    merchant_name = Column(String(255), nullable=False)
    reported_by = Column(String(255), default="1 Verified Customer", nullable=False)
    reporters_count = Column(Integer, default=1, nullable=False)
    date = Column(String(64), nullable=False)
    reason = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    incidents = relationship("FraudIncident", back_populates="report", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "accountNumber": self.account_number,
            "merchantName": self.merchant_name,
            "reportedBy": self.reported_by,
            "reportersCount": self.reporters_count,
            "date": self.date,
            "reason": self.reason,
            "details": self.details,
            "incidents": [inc.to_dict() for inc in self.incidents],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class FraudIncident(Base):
    """Specific reported incident attached to a fraud report."""

    __tablename__ = "fraud_incidents"

    id = Column(String(64), primary_key=True, default=lambda: f"inc_{uuid.uuid4().hex[:12]}")
    report_id = Column(String(64), ForeignKey("fraud_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    account_number = Column(String(10), index=True, nullable=False)
    date = Column(String(64), nullable=False)
    reporter = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    payment_ref = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    report = relationship("FraudReport", back_populates="incidents")

    def to_dict(self) -> dict:
        return {
            "date": self.date,
            "reporter": self.reporter,
            "summary": self.summary,
            "description": self.description,
            "paymentRef": self.payment_ref,
        }
