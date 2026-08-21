from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.enums import PaymentStatus, ProviderStatus, WorkflowStage
from backend.app.core.errors import AppError
from backend.app.core.time import as_utc, utcnow
from backend.app.models import (
    MerchantTransaction,
    PaymentRequest,
    Receipt,
    Verification,
)
from backend.app.providers.wema import TransactionCandidate, WemaTransactionProvider
from backend.app.services.normalization import (
    account_hint_matches,
    combine_receipt_datetime,
    names_compatible,
    normalize_currency,
    normalize_reference,
)
from backend.app.services.payments import get_current_receipt

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class MatchOutcome:
    status: PaymentStatus
    stage: WorkflowStage
    reason_code: str
    reason: str
    transaction: MerchantTransaction | None
    amount_match: bool | None
    reference_match: bool | None
    currency_match: bool | None
    merchant_match: bool | None
    date_match: bool | None


def _reference_match(receipt: Receipt, candidate: TransactionCandidate) -> bool | None:
    receipt_reference = normalize_reference(receipt.reference)
    if not receipt_reference:
        return None
    return receipt_reference == normalize_reference(candidate.transaction.provider_reference)


def _amount_match(
    payment: PaymentRequest,
    receipt: Receipt,
    transaction: MerchantTransaction,
) -> bool | None:
    expected_matches = payment.amount_minor == transaction.amount_minor
    if receipt.amount_minor is None:
        return None if expected_matches else False
    return expected_matches and receipt.amount_minor == transaction.amount_minor


def _currency_match(
    payment: PaymentRequest,
    receipt: Receipt,
    transaction: MerchantTransaction,
) -> bool | None:
    expected = normalize_currency(payment.currency)
    received = normalize_currency(transaction.currency)
    expected_matches = expected == received
    receipt_currency = normalize_currency(receipt.currency)
    if receipt_currency is None:
        return None if expected_matches else False
    return expected_matches and receipt_currency == received


def _merchant_match(
    payment: PaymentRequest,
    receipt: Receipt,
    transaction: MerchantTransaction,
) -> bool | None:
    merchant = payment.merchant
    transaction_account_match = account_hint_matches(
        transaction.recipient_account_hint, merchant.wema_account_number
    )
    if transaction_account_match is False:
        return False

    receipt_account_match = account_hint_matches(receipt.account_hint, merchant.wema_account_number)
    if receipt_account_match is False:
        return False

    if receipt.recipient_name:
        name_matches = any(
            names_compatible(receipt.recipient_name, expected)
            for expected in (
                merchant.wema_account_name,
                merchant.business_name,
                merchant.display_name,
            )
        )
        if not name_matches:
            return False

    if transaction_account_match is True or receipt_account_match is True:
        return True
    # Provider lookup is already merchant-scoped; missing OCR recipient fields do not contradict it.
    return None


def _date_match(receipt: Receipt, transaction: MerchantTransaction) -> bool | None:
    receipt_datetime = combine_receipt_datetime(
        receipt.transaction_date, receipt.transaction_time
    )
    transaction_datetime = as_utc(transaction.transaction_date)
    if receipt_datetime is None or transaction_datetime is None:
        return None
    return abs(receipt_datetime - transaction_datetime) <= timedelta(days=3)


def _not_received(
    reason_code: str,
    reason: str,
    transaction: MerchantTransaction | None = None,
    **matches: bool | None,
) -> MatchOutcome:
    return MatchOutcome(
        status=PaymentStatus.NOT_RECEIVED,
        stage=WorkflowStage.COMPLETE,
        reason_code=reason_code,
        reason=reason,
        transaction=transaction,
        amount_match=matches.get("amount_match"),
        reference_match=matches.get("reference_match"),
        currency_match=matches.get("currency_match"),
        merchant_match=matches.get("merchant_match"),
        date_match=matches.get("date_match"),
    )


def evaluate_match(
    payment: PaymentRequest,
    receipt: Receipt,
    candidate: TransactionCandidate | None,
) -> MatchOutcome:
    if candidate is None:
        return _not_received(
            "TRANSACTION_NOT_FOUND",
            "PayPruf could not find a corresponding merchant-side transaction.",
        )

    transaction = candidate.transaction
    amount_match = _amount_match(payment, receipt, transaction)
    reference_match = _reference_match(receipt, candidate)
    currency_match = _currency_match(payment, receipt, transaction)
    merchant_match = _merchant_match(payment, receipt, transaction)
    date_match = _date_match(receipt, transaction)
    match_values = {
        "amount_match": amount_match,
        "reference_match": reference_match,
        "currency_match": currency_match,
        "merchant_match": merchant_match,
        "date_match": date_match,
    }

    if transaction.status == ProviderStatus.PENDING:
        return MatchOutcome(
            status=PaymentStatus.PENDING,
            stage=WorkflowStage.BANK_PENDING,
            reason_code="BANK_TRANSACTION_PENDING",
            reason="A corresponding transaction was found but is still pending at the provider.",
            transaction=transaction,
            **match_values,
        )
    if transaction.status in {ProviderStatus.FAILED, ProviderStatus.REVERSED}:
        return _not_received(
            "TRANSACTION_NOT_SUCCESSFUL",
            f"The corresponding merchant-side transaction is {transaction.status.value.lower()}.",
            transaction,
            **match_values,
        )
    if transaction.claimed_by_payment_id not in {None, payment.id}:
        return MatchOutcome(
            status=PaymentStatus.MISMATCH,
            stage=WorkflowStage.COMPLETE,
            reason_code="TRANSACTION_ALREADY_USED",
            reason="This merchant-side transaction is already linked to another payment request.",
            transaction=transaction,
            **match_values,
        )

    contradictions: list[tuple[str, str]] = []
    if amount_match is False:
        contradictions.append(
            ("AMOUNT_MISMATCH", "The amount received does not match this payment request.")
        )
    if currency_match is False:
        contradictions.append(
            ("CURRENCY_MISMATCH", "The receipt and merchant transaction currencies do not match.")
        )
    if reference_match is False:
        contradictions.append(
            ("REFERENCE_MISMATCH", "The receipt reference does not match the merchant transaction.")
        )
    if merchant_match is False:
        contradictions.append(
            ("MERCHANT_MISMATCH", "The receipt recipient does not match the merchant account.")
        )
    if date_match is False:
        contradictions.append(
            ("DATE_MISMATCH", "The receipt date is outside the expected transaction window.")
        )
    if contradictions:
        reason_code, reason = contradictions[0]
        return MatchOutcome(
            status=PaymentStatus.MISMATCH,
            stage=WorkflowStage.COMPLETE,
            reason_code=reason_code,
            reason=reason,
            transaction=transaction,
            **match_values,
        )

    return MatchOutcome(
        status=PaymentStatus.CONFIRMED,
        stage=WorkflowStage.COMPLETE,
        reason_code="MATCH_CONFIRMED",
        reason="PayPruf found a matching successful merchant-side transaction.",
        transaction=transaction,
        **match_values,
    )


def verify_payment(
    session: Session,
    payment: PaymentRequest,
    provider: WemaTransactionProvider,
) -> Verification:
    receipt = get_current_receipt(session, payment.id)
    if receipt is None:
        raise AppError(
            409,
            "RECEIPT_REQUIRED",
            "Upload a receipt before verifying this payment.",
        )
    logger.info(
        "verification_started",
        extra={"event": "verification_started", "payment_id": payment.id},
    )
    payment.stage = WorkflowStage.VERIFYING
    payment.updated_at = utcnow()
    session.flush()

    candidate = provider.find_transaction(session, payment, receipt)
    outcome = evaluate_match(payment, receipt, candidate)
    logger.info(
        "sandbox_match_result",
        extra={
            "event": "sandbox_match_result",
            "payment_id": payment.id,
            "result": outcome.status.value,
            "reason_code": outcome.reason_code,
        },
    )

    verification = session.scalar(
        select(Verification).where(Verification.payment_id == payment.id)
    )
    if verification is None:
        verification = Verification(
            id=str(uuid.uuid4()),
            payment_id=payment.id,
            receipt_id=receipt.id,
            status=outcome.status,
            reason_code=outcome.reason_code,
            reason=outcome.reason,
            verified_at=utcnow(),
        )
        session.add(verification)

    verification.receipt_id = receipt.id
    verification.transaction_id = outcome.transaction.id if outcome.transaction else None
    verification.status = outcome.status
    verification.reason_code = outcome.reason_code
    verification.reason = outcome.reason
    verification.amount_match = outcome.amount_match
    verification.reference_match = outcome.reference_match
    verification.currency_match = outcome.currency_match
    verification.merchant_match = outcome.merchant_match
    verification.date_match = outcome.date_match
    verification.verified_at = utcnow()
    payment.status = outcome.status
    payment.stage = outcome.stage
    payment.status_reason = outcome.reason
    payment.updated_at = verification.verified_at

    if outcome.status == PaymentStatus.CONFIRMED and outcome.transaction is not None:
        outcome.transaction.claimed_by_payment_id = payment.id
        session.add(outcome.transaction)

    try:
        session.add(payment)
        session.commit()
    except Exception:
        session.rollback()
        raise
    session.refresh(verification)
    # Load relationships before the request-scoped session closes.
    _ = verification.receipt
    _ = verification.transaction
    logger.info(
        "verification_completed",
        extra={
            "event": "verification_completed",
            "payment_id": payment.id,
            "verification_id": verification.id,
            "status": verification.status.value,
        },
    )
    return verification

