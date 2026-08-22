"""Risk Intelligence and Fraud Reporting Endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.risk import AccountLookupResponse, RiskCheckResponse, FraudReportCreate
from app.services.risk_service import risk_service

router = APIRouter(prefix="/risk", tags=["Risk Intelligence"])


@router.get("/lookup/{account_number}", response_model=AccountLookupResponse)
def lookup_merchant_account(
    account_number: str,
    db: Session = Depends(get_db)
):
    """Lookup 10-digit account number in registered merchant directory."""
    return risk_service.lookup_account(db, account_number)


@router.get("/check/{account_number}", response_model=RiskCheckResponse)
def check_account_risk(
    account_number: str,
    db: Session = Depends(get_db)
):
    """Check crowd-sourced fraud report registry for incidents associated with an account."""
    return risk_service.check_account_risk(db, account_number)


@router.post("/report")
def report_merchant_account(
    req: FraudReportCreate,
    db: Session = Depends(get_db)
):
    """File a verified fraud incident against a merchant account."""
    return risk_service.report_merchant_account(db, req)
