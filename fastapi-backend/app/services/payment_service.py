"""Payment Management and Merchant Dashboard Metrics Service."""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.payment import Payment, Receipt, BankTransaction, Verification
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentDetailsResponse,
    PublicPaymentResponse,
    DashboardResponse,
    MetricSummary,
    MerchantSummary,
)


class PaymentService:
    """Handles payment links, lifecycle, and dashboard analytics."""

    def create_payment(self, db: Session, user: User, req: PaymentCreate) -> PaymentResponse:
        """Create a new payment request and generate public token."""
        # Clean amount
        clean_amount = req.amount.replace(",", "").strip()
        try:
            val = Decimal(clean_amount)
            if val <= 0:
                raise ValueError()
            formatted_amount = f"{val:.2f}"
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter an amount greater than zero with no more than 2 decimal places."
            )

        pay_id = f"pay_{uuid.uuid4().hex[:12]}"
        public_token = f"tok_{uuid.uuid4().hex[:10]}"
        year = datetime.now().year
        cust_prefix = "".join(filter(str.isalnum, req.customer_name))[:4].upper() or "CUST"
        reference = f"PRF-{year}-{cust_prefix}-{random.randint(100, 999)}"

        expires_hours = req.expires_in_hours or 24
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)

        description = req.description.strip() if req.description else "Payment request"

        payment = Payment(
            id=pay_id,
            merchant_id=user.id,
            customer_name=req.customer_name.strip(),
            customer_phone=req.customer_phone.strip() if req.customer_phone else None,
            amount=formatted_amount,
            currency=req.currency or "NGN",
            description=description,
            order_note=req.order_note.strip() if req.order_note else None,
            reference=reference,
            public_token=public_token,
            public_url=f"/pay/{public_token}",
            status="PENDING",
            status_reason="Payment request created. Awaiting customer transfer & receipt upload.",
            expires_at=expires_at,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

        return PaymentResponse(**payment.to_dict())

    def get_merchant_payments(self, db: Session, user_id: str) -> List[PaymentResponse]:
        """List all payments belonging to a merchant."""
        payments = (
            db.query(Payment)
            .filter(Payment.merchant_id == user_id)
            .order_by(Payment.created_at.desc())
            .all()
        )
        return [PaymentResponse(**p.to_dict()) for p in payments]

    def get_payment_by_id(self, db: Session, payment_id: str) -> Payment:
        """Find payment by ID or public token."""
        payment = (
            db.query(Payment)
            .filter(
                (Payment.id == payment_id) |
                (Payment.public_token == payment_id) |
                (Payment.reference == payment_id)
            )
            .first()
        )
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment record not found."
            )
        return payment

    def get_payment_details_view(self, db: Session, payment_id: str) -> PaymentDetailsResponse:
        """Construct full audit view for PaymentDetailsPage."""
        payment = self.get_payment_by_id(db, payment_id)
        merchant = payment.merchant

        merchant_info = {
            "business_name": merchant.business_name if merchant else "PayPruf Merchant",
            "bank_name": "Wema Bank (Sandbox)",
            "wema_account_name": merchant.account_name if merchant else "Settlement Account",
            "wema_account_number": merchant.wema_account_number if merchant else "0123456789",
            "wema_account_number_hint": merchant.wema_account_number if merchant else "0123456789",
        }

        ver_dict = payment.verification.to_dict() if payment.verification else None
        timeline = ver_dict.get("timeline", []) if ver_dict else []

        return PaymentDetailsResponse(
            payment=PaymentResponse(**payment.to_dict()),
            merchant=merchant_info,
            receipt=payment.receipt.to_dict() if payment.receipt else None,
            transaction=payment.transaction.to_dict() if payment.transaction else None,
            verification=ver_dict,
            timeline=timeline,
        )

    def get_public_payment_view(self, db: Session, token: str) -> PublicPaymentResponse:
        """Construct customer portal view for CustomerPaymentPage."""
        payment = self.get_payment_by_id(db, token)
        merchant = payment.merchant

        merchant_info = {
            "business_name": merchant.business_name if merchant else "PayPruf Merchant",
        }

        instructions = {
            "bank_name": "Wema Bank (Demo Sandbox)",
            "account_name": merchant.account_name if merchant else "Settlement Account",
            "account_number": merchant.wema_account_number if merchant else "0123456789",
        }

        return PublicPaymentResponse(
            payment=PaymentResponse(**payment.to_dict()),
            merchant=merchant_info,
            payment_instructions=instructions,
            receipt=payment.receipt.to_dict() if payment.receipt else None,
            verification=payment.verification.to_dict() if payment.verification else None,
        )

    def get_dashboard(self, db: Session, user: User) -> DashboardResponse:
        """Compute aggregated metrics for the merchant dashboard overview."""
        payments = (
            db.query(Payment)
            .filter(Payment.merchant_id == user.id)
            .order_by(Payment.created_at.desc())
            .all()
        )

        def sum_value(items: List[Payment]) -> float:
            total = 0.0
            for item in items:
                try:
                    total += float(item.amount)
                except Exception:
                    pass
            return round(total, 2)

        confirmed = [p for p in payments if p.status == "CONFIRMED"]
        pending = [p for p in payments if p.status == "PENDING"]
        mismatch = [p for p in payments if p.status == "MISMATCH"]
        not_received = [p for p in payments if p.status == "NOT_RECEIVED"]

        return DashboardResponse(
            merchant=MerchantSummary(
                id=user.id,
                display_name=user.full_name or user.business_name or "Merchant",
                business_name=user.business_name or user.full_name or "Merchant",
                wema_account_name=user.account_name or user.business_name or "Settlement Account",
                wema_account_number_hint=user.wema_account_number or "0123456789",
            ),
            total=MetricSummary(count=len(payments), value=sum_value(payments)),
            confirmed=MetricSummary(count=len(confirmed), value=sum_value(confirmed)),
            pending=MetricSummary(count=len(pending), value=sum_value(pending)),
            mismatch=MetricSummary(count=len(mismatch), value=sum_value(mismatch)),
            not_received=MetricSummary(count=len(not_received), value=sum_value(not_received)),
            recent_payments=[PaymentResponse(**p.to_dict()) for p in payments],
        )


payment_service = PaymentService()
