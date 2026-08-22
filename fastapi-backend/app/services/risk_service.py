"""Risk Intelligence and Crowd-Sourced Fraud Reporting Service."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.fraud_report import FraudReport, FraudIncident
from app.models.user import MerchantDirectory, User
from app.schemas.risk import (
    AccountLookupResponse,
    RiskCheckResponse,
    FraudReportResponse,
    FraudIncidentResponse,
    FraudReportCreate,
)


class RiskService:
    """Manages merchant account directory and fraud incident reporting."""

    def lookup_account(self, db: Session, account_number: str) -> AccountLookupResponse:
        """Search merchant directory or registered users by 10-digit account number."""
        clean_number = re.sub(r"\D", "", str(account_number or ""))[:10]
        if len(clean_number) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 10-digit account number."
            )

        # 1. Search registered users
        user = db.query(User).filter(User.wema_account_number == clean_number).first()
        if user:
            return AccountLookupResponse(
                accountNumber=clean_number,
                accountName=user.account_name or user.full_name or "Registered Merchant",
                businessName=user.business_name or user.full_name or "Merchant Enterprise",
                registered=True,
                bankName="Wema Bank / ALAT"
            )

        # 2. Search merchant directory
        entry = db.query(MerchantDirectory).filter(MerchantDirectory.account_number == clean_number).first()
        if entry:
            return AccountLookupResponse(
                accountNumber=clean_number,
                accountName=entry.account_name,
                businessName=entry.business_name,
                registered=entry.registered,
                bankName=entry.bank_name
            )

        # 3. Demo fallback
        if clean_number == "0123456789":
            return AccountLookupResponse(
                accountNumber=clean_number,
                accountName="Tola Fashion Enterprise",
                businessName="Tola Fashion",
                registered=True,
                bankName="Wema Bank / ALAT"
            )

        # 4. Unregistered commercial account
        return AccountLookupResponse(
            accountNumber=clean_number,
            accountName="Unregistered Commercial Account",
            businessName="Unknown Merchant",
            registered=False,
            bankName="Wema Bank"
        )

    def check_account_risk(self, db: Session, account_number: str) -> RiskCheckResponse:
        """Query fraud report history and compute risk level for an account number."""
        clean_number = re.sub(r"\D", "", str(account_number or ""))[:10]
        lookup = self.lookup_account(db, clean_number)

        reports = (
            db.query(FraudReport)
            .filter(FraudReport.account_number == clean_number)
            .order_by(FraudReport.created_at.desc())
            .all()
        )

        has_reports = len(reports) > 0
        total_incidents = sum(len(r.incidents) or r.reporters_count or 1 for r in reports)
        total_reporters = sum(r.reporters_count or 1 for r in reports)

        report_responses = [FraudReportResponse(**r.to_dict()) for r in reports]

        return RiskCheckResponse(
            accountNumber=clean_number,
            accountName=lookup.accountName,
            businessName=lookup.businessName,
            registered=lookup.registered,
            hasReports=has_reports,
            reportCount=total_incidents,
            reportersCount=total_reporters,
            reports=report_responses,
            riskLevel="FLAGGED" if has_reports else "CLEAN",
            summary=f"Community Alert: {total_incidents} Report(s) Found" if has_reports else "No Incidents on Record",
            alertTitle="Caution Advised: Account Flagged" if has_reports else "No Community Reports Found",
            alertMessage=(
                "This account has received reports from other users. Exercise caution."
                if has_reports
                else "PayPruf has no reported incidents associated with this account."
            ),
            advisoryDisclaimer=(
                "Advisory Risk Indicator: The PayPruf Risk Intelligence tool is an advisory crowd-sourced "
                "register. Regardless of report status, always require full bank ledger reconciliation before dispatching orders."
            )
        )

    def report_merchant_account(self, db: Session, req: FraudReportCreate) -> dict:
        """Create or update a fraud report against a merchant account."""
        clean_number = re.sub(r"\D", "", str(req.accountNumber or ""))[:10]
        if len(clean_number) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid merchant account number provided."
            )
        if not req.reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please select a reason for reporting this account."
            )

        now_str = datetime.now().strftime("%-m/%-d/%Y")
        reporter_text = f"Verified Customer ({req.reporterName})" if req.reporterName else "1 Verified Customer"

        existing_report = db.query(FraudReport).filter(FraudReport.account_number == clean_number).first()

        if existing_report:
            existing_report.reporters_count += 1
            existing_report.reason = f"Reported {existing_report.reporters_count} times for {req.reason.lower()}"
            existing_report.details = req.details or existing_report.details
            existing_report.date = now_str

            incident = FraudIncident(
                id=f"inc_{uuid.uuid4().hex[:12]}",
                report_id=existing_report.id,
                account_number=clean_number,
                date=now_str,
                reporter=reporter_text,
                summary=req.reason,
                description=req.details or req.reason,
                payment_ref=req.paymentRef,
            )
            db.add(incident)
        else:
            rep_id = f"rep_{uuid.uuid4().hex[:12]}"
            new_report = FraudReport(
                id=rep_id,
                account_number=clean_number,
                merchant_name=req.merchantName or "Merchant Account",
                reported_by=reporter_text,
                reporters_count=1,
                date=now_str,
                reason=f"Reported 1 time for {req.reason.lower()}",
                details=req.details or req.reason,
            )
            db.add(new_report)
            db.flush()

            incident = FraudIncident(
                id=f"inc_{uuid.uuid4().hex[:12]}",
                report_id=rep_id,
                account_number=clean_number,
                date=now_str,
                reporter=reporter_text,
                summary=req.reason,
                description=req.details or req.reason,
                payment_ref=req.paymentRef,
            )
            db.add(incident)

        db.commit()
        return {
            "success": True,
            "message": "Fraud report successfully registered in PayPruf Risk Intelligence register."
        }


risk_service = RiskService()
