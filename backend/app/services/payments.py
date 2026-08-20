from __future__ import annotations

import secrets
import string
import uuid
from datetime import timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from backend.app.core.enums import PaymentStatus, WorkflowStage
from backend.app.core.errors import AppError
from backend.app.core.time import utcnow
from backend.app.models import (
    Merchant,
    MerchantTransaction,
    PaymentRequest,
    Receipt,
    Verification,
)
from backend.app.schemas.api import PaymentCreate
from backend.app.services.normalization import decimal_to_minor

REFERENCE_ALPHABET = string.ascii_uppercase + string.digits


def get_primary_merchant(session: Session) -> Merchant:
    merchant = session.scalar(select(Merchant).order_by(Merchant.created_at).limit(1))
    if merchant is None:
        raise AppError(
            503,
            "MERCHANT_NOT_CONFIGURED",
            "The demo merchant has not been configured yet.",
        )
    return merchant


def get_payment(session: Session, payment_id: str) -> PaymentRequest:
    payment = session.scalar(
        select(PaymentRequest)
        .where(PaymentRequest.id == payment_id)
        .options(joinedload(PaymentRequest.merchant))
    )
    if payment is None:
        raise AppError(404, "PAYMENT_NOT_FOUND", "The requested payment could not be found.")
    return payment


def get_public_payment(session: Session, token: str) -> PaymentRequest:
    payment = session.scalar(
        select(PaymentRequest)
        .where(PaymentRequest.public_token == token)
        .options(joinedload(PaymentRequest.merchant))
    )
    if payment is None:
        raise AppError(404, "PAYMENT_NOT_FOUND", "The requested payment could not be found.")
    return payment


def get_current_receipt(session: Session, payment_id: str) -> Receipt | None:
    return session.scalar(
        select(Receipt)
        .where(Receipt.payment_id == payment_id)
        .order_by(Receipt.created_at.desc(), Receipt.id.desc())
        .limit(1)
    )


def get_current_verification(session: Session, payment_id: str) -> Verification | None:
    return session.scalar(
        select(Verification)
        .where(Verification.payment_id == payment_id)
        .options(joinedload(Verification.receipt), joinedload(Verification.transaction))
    )


def _unique_reference(session: Session) -> str:
    for _ in range(20):
        suffix = "".join(secrets.choice(REFERENCE_ALPHABET) for _ in range(6))
        reference = f"PRUF-{suffix}"
        if session.scalar(
            select(PaymentRequest.id).where(PaymentRequest.reference == reference)
        ) is None:
            return reference
    raise AppError(503, "REFERENCE_GENERATION_FAILED", "A unique payment reference could not be generated.")


def _unique_public_token(session: Session) -> str:
    for _ in range(10):
        token = secrets.token_urlsafe(32)
        if session.scalar(
            select(PaymentRequest.id).where(PaymentRequest.public_token == token)
        ) is None:
            return token
    raise AppError(503, "TOKEN_GENERATION_FAILED", "A secure payment link could not be generated.")


def create_payment(session: Session, data: PaymentCreate) -> PaymentRequest:
    merchant = get_primary_merchant(session)
    now = utcnow()
    payment = PaymentRequest(
        id=str(uuid.uuid4()),
        merchant_id=merchant.id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        amount_minor=decimal_to_minor(data.amount),
        currency="NGN",
        description=data.description,
        order_note=data.order_note,
        reference=_unique_reference(session),
        public_token=_unique_public_token(session),
        status=PaymentStatus.PENDING,
        stage=WorkflowStage.AWAITING_RECEIPT,
        status_reason="Waiting for a receipt to be uploaded.",
        expires_at=now + timedelta(hours=data.expires_in_hours),
        created_at=now,
        updated_at=now,
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)
    payment.merchant = merchant
    return payment


def list_payments(
    session: Session,
    *,
    status: PaymentStatus | None,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[PaymentRequest], int]:
    predicates = []
    if status is not None:
        predicates.append(PaymentRequest.status == status)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        predicates.append(
            or_(
                PaymentRequest.customer_name.ilike(pattern),
                PaymentRequest.reference.ilike(pattern),
                PaymentRequest.description.ilike(pattern),
            )
        )
    count_statement = select(func.count(PaymentRequest.id))
    statement = select(PaymentRequest).order_by(PaymentRequest.created_at.desc())
    if predicates:
        count_statement = count_statement.where(*predicates)
        statement = statement.where(*predicates)
    total = int(session.scalar(count_statement) or 0)
    items = list(session.scalars(statement.limit(limit).offset(offset)).all())
    return items, total


def record_first_open(session: Session, payment: PaymentRequest) -> None:
    if payment.first_opened_at is not None:
        return
    payment.first_opened_at = utcnow()
    payment.updated_at = utcnow()
    session.add(payment)
    session.commit()


def clear_current_verification(session: Session, payment: PaymentRequest) -> None:
    verification = session.scalar(
        select(Verification).where(Verification.payment_id == payment.id)
    )
    if verification is not None:
        claimed_transaction = session.scalar(
            select(MerchantTransaction).where(
                MerchantTransaction.claimed_by_payment_id == payment.id
            )
        )
        if claimed_transaction is not None:
            claimed_transaction.claimed_by_payment_id = None
            session.add(claimed_transaction)
        session.delete(verification)
    payment.status = PaymentStatus.PENDING
    payment.stage = WorkflowStage.READY_TO_VERIFY
    payment.status_reason = "Receipt extracted and ready for verification."
    payment.updated_at = utcnow()
