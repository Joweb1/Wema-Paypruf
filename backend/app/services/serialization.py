from __future__ import annotations

from typing import Any

from backend.app.core.config import Settings
from backend.app.core.enums import TimelineState
from backend.app.core.time import as_utc, utcnow
from backend.app.models import (
    Merchant,
    MerchantTransaction,
    PaymentRequest,
    Receipt,
    Verification,
)
from backend.app.services.normalization import minor_to_money


def account_number_hint(account_number: str) -> str:
    digits = "".join(character for character in account_number if character.isdigit())
    return f"ending {digits[-4:]}" if len(digits) >= 4 else "demo account"


def merchant_view(merchant: Merchant, *, public: bool = False) -> dict[str, Any]:
    base = {
        "id": merchant.id,
        "business_name": merchant.business_name,
        "display_name": merchant.display_name,
        "phone": None if public else merchant.phone,
        "wema_account_name": merchant.wema_account_name,
        "wema_account_number": None if public else merchant.wema_account_number,
        "wema_account_number_hint": account_number_hint(merchant.wema_account_number),
        "bank_name": "Wema Bank",
        "created_at": as_utc(merchant.created_at),
    }
    return base


def payment_instructions(merchant: Merchant) -> dict[str, str]:
    return {
        "bank_name": "Wema Bank",
        "account_name": merchant.wema_account_name,
        "account_number": merchant.wema_account_number,
        "account_number_hint": account_number_hint(merchant.wema_account_number),
        "environment": "Wema Sandbox / Demo Environment",
    }


def payment_view(
    payment: PaymentRequest,
    settings: Settings,
    *,
    public: bool = False,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "id": payment.id,
        "customer_name": payment.customer_name,
        "amount": minor_to_money(payment.amount_minor),
        "currency": payment.currency,
        "description": payment.description,
        "order_note": payment.order_note,
        "reference": payment.reference,
        "public_url": f"{settings.public_app_url}/pay/{payment.public_token}",
        "status": payment.status,
        "stage": payment.stage,
        "status_reason": payment.status_reason,
        "expires_at": as_utc(payment.expires_at),
        "is_expired": is_expired(payment),
        "created_at": as_utc(payment.created_at),
        "updated_at": as_utc(payment.updated_at),
    }
    if not public:
        result["customer_phone"] = payment.customer_phone
        result["public_token"] = payment.public_token
    return result


def is_expired(payment: PaymentRequest) -> bool:
    expires_at = as_utc(payment.expires_at)
    return bool(expires_at and expires_at <= utcnow())


def receipt_view(
    payment: PaymentRequest,
    receipt: Receipt,
    *,
    public: bool = False,
) -> dict[str, Any]:
    prefix = f"/api/public/payments/{payment.public_token}" if public else f"/api/payments/{payment.id}"
    result: dict[str, Any] = {
        "id": receipt.id,
        "original_filename": receipt.original_filename,
        "mime_type": receipt.mime_type,
        "size_bytes": receipt.size_bytes,
        "amount": minor_to_money(receipt.amount_minor),
        "currency": receipt.currency,
        "reference": receipt.reference,
        "bank": receipt.bank,
        "transaction_date": receipt.transaction_date,
        "transaction_time": receipt.transaction_time,
        "sender_name": receipt.sender_name,
        "recipient_name": receipt.recipient_name,
        "status_text": receipt.status_text,
        "account_hint": receipt.account_hint,
        "confidence": round(receipt.confidence, 4),
        "created_at": as_utc(receipt.created_at),
        "extracted_at": as_utc(receipt.extracted_at),
        "preview_url": f"{prefix}/receipt/file",
    }
    if not public:
        result["raw_text"] = receipt.raw_text
    return result


def transaction_view(transaction: MerchantTransaction | None) -> dict[str, Any] | None:
    if transaction is None:
        return None
    return {
        "id": transaction.id,
        "provider": transaction.provider,
        "provider_reference": transaction.provider_reference,
        "payment_reference": transaction.payment_reference,
        "amount": minor_to_money(transaction.amount_minor),
        "currency": transaction.currency,
        "sender_name": transaction.sender_name,
        "recipient_account_hint": transaction.recipient_account_hint,
        "status": transaction.status,
        "transaction_date": as_utc(transaction.transaction_date),
    }


def timeline_view(
    payment: PaymentRequest,
    receipt: Receipt | None,
    verification: Verification | None,
) -> list[dict[str, Any]]:
    entries = [
        ("created", "Payment request created", payment.created_at),
        ("opened", "Customer opened PayPruf link", payment.first_opened_at),
        ("uploaded", "Receipt uploaded", receipt.created_at if receipt else None),
        ("extracted", "Receipt extracted", receipt.extracted_at if receipt else None),
        (
            "checked",
            "Merchant transaction checked",
            verification.verified_at if verification else None,
        ),
        (
            "verified",
            "Verification completed",
            verification.verified_at if verification else None,
        ),
    ]
    return [
        {
            "key": key,
            "label": label,
            "timestamp": as_utc(timestamp),
            "state": TimelineState.COMPLETE if timestamp else TimelineState.PENDING,
        }
        for key, label, timestamp in entries
    ]


def comparison_view(
    payment: PaymentRequest,
    receipt: Receipt,
    transaction: MerchantTransaction | None,
) -> dict[str, Any]:
    return {
        "expected_amount": minor_to_money(payment.amount_minor),
        "receipt_amount": minor_to_money(receipt.amount_minor),
        "received_amount": minor_to_money(transaction.amount_minor) if transaction else None,
        "receipt_reference": receipt.reference,
        "transaction_reference": transaction.provider_reference if transaction else None,
    }


def verification_view(
    payment: PaymentRequest,
    verification: Verification,
    *,
    public: bool = False,
    summary: bool = False,
) -> dict[str, Any]:
    receipt = verification.receipt
    transaction = verification.transaction
    base: dict[str, Any] = {
        "id": verification.id,
        "payment_id": payment.id,
        "status": verification.status,
        "reason_code": verification.reason_code,
        "reason": verification.reason,
        "verified_at": as_utc(verification.verified_at),
        "comparison": comparison_view(payment, receipt, transaction),
    }
    if summary:
        return base
    base.update(
        {
            "amount_match": verification.amount_match,
            "reference_match": verification.reference_match,
            "currency_match": verification.currency_match,
            "merchant_match": verification.merchant_match,
            "date_match": verification.date_match,
            "receipt": receipt_view(payment, receipt, public=True),
            "transaction": transaction_view(transaction),
            "timeline": timeline_view(payment, receipt, verification),
        }
    )
    return base

