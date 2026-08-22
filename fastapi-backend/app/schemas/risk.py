"""Pydantic schemas for Risk Intelligence and Fraud Reporting."""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class AccountLookupResponse(BaseModel):
    """Result of searching an account number in the merchant directory."""
    accountNumber: str
    accountName: str
    businessName: str
    registered: bool
    bankName: str = "Wema Bank / ALAT"


class FraudIncidentResponse(BaseModel):
    date: str
    reporter: str
    summary: str
    description: Optional[str] = None
    paymentRef: Optional[str] = None


class FraudReportResponse(BaseModel):
    id: str
    accountNumber: str
    merchantName: str
    reportedBy: str
    reportersCount: int
    date: str
    reason: str
    details: Optional[str] = None
    incidents: List[FraudIncidentResponse] = []
    createdAt: Optional[str] = None


class RiskCheckResponse(BaseModel):
    """Full risk assessment for an account number."""
    accountNumber: str
    accountName: str
    businessName: str
    registered: bool
    hasReports: bool
    reportCount: int
    reportersCount: int
    reports: List[FraudReportResponse] = []
    riskLevel: str  # CLEAN | FLAGGED
    summary: str
    alertTitle: str
    alertMessage: str
    advisoryDisclaimer: str


class FraudReportCreate(BaseModel):
    """Payload to submit a fraud report."""
    accountNumber: str = Field(..., min_length=10, max_length=10)
    merchantName: Optional[str] = "Merchant Account"
    reason: str = Field(..., min_length=3)
    details: Optional[str] = None
    paymentRef: Optional[str] = None
    reporterName: Optional[str] = None
