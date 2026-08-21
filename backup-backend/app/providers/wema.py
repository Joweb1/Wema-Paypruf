from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import Settings
from backend.app.core.time import as_utc
from backend.app.models import MerchantTransaction, PaymentRequest, Receipt
from backend.app.services.normalization import normalize_reference


@dataclass(frozen=True, slots=True)
class TransactionCandidate:
    transaction: MerchantTransaction
    match_method: str


class WemaTransactionProvider(Protocol):
    mode: str
    provider_name: str

    def find_transaction(
        self,
        session: Session,
        payment: PaymentRequest,
        receipt: Receipt,
    ) -> TransactionCandidate | None: ...


class MockWemaTransactionProvider:
    mode = "mock"
    provider_name = "WEMA_MOCK"

    def __init__(self, settings: Settings) -> None:
        self.match_window_hours = settings.match_window_hours

    def find_transaction(
        self,
        session: Session,
        payment: PaymentRequest,
        receipt: Receipt,
    ) -> TransactionCandidate | None:
        transactions = list(
            session.scalars(
                select(MerchantTransaction).where(
                    MerchantTransaction.merchant_id == payment.merchant_id,
                    MerchantTransaction.provider == self.provider_name,
                )
            ).all()
        )
        created_at = as_utc(payment.created_at)
        expires_at = as_utc(payment.expires_at)
        if created_at is None or expires_at is None:
            return None
        earliest = created_at - timedelta(hours=self.match_window_hours)
        latest = expires_at + timedelta(hours=self.match_window_hours)
        bounded = [
            transaction
            for transaction in transactions
            if transaction.transaction_date is not None
            and earliest <= as_utc(transaction.transaction_date) <= latest  # type: ignore[operator]
        ]

        receipt_reference = normalize_reference(receipt.reference)
        if receipt_reference:
            for transaction in bounded:
                if normalize_reference(transaction.provider_reference) == receipt_reference:
                    return TransactionCandidate(transaction, "RECEIPT_REFERENCE")

        payment_reference = normalize_reference(payment.reference)
        for transaction in bounded:
            if (
                transaction.payment_reference
                and normalize_reference(transaction.payment_reference) == payment_reference
            ):
                return TransactionCandidate(transaction, "PAYMENT_REFERENCE")
        return None


def create_wema_provider(settings: Settings) -> MockWemaTransactionProvider:
    # Settings validation intentionally rejects undocumented live modes.
    return MockWemaTransactionProvider(settings)

