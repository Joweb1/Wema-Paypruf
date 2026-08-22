"""Merchant Payments Management Endpoints."""

from __future__ import annotations

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.payment import Payment, Receipt
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentDetailsResponse
from app.schemas.verification import VerificationResponse
from app.services.ocr_service import ocr_service
from app.services.payment_service import payment_service
from app.services.reconcile_service import reconcile_service
from app.services.storage_service import storage_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    req: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new payment request and generate a shareable link."""
    return payment_service.create_payment(db, current_user, req)


@router.get("", response_model=List[PaymentResponse])
def list_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all payments for the active merchant."""
    return payment_service.get_merchant_payments(db, current_user.id)


@router.get("/{payment_id}", response_model=PaymentDetailsResponse)
def get_payment_details(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full audit breakdown for PaymentDetailsPage."""
    return payment_service.get_payment_details_view(db, payment_id)


@router.post("/{payment_id}/recheck", response_model=VerificationResponse)
def recheck_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Re-run automated bank reconciliation against the Wema sandbox ledger."""
    payment = payment_service.get_payment_by_id(db, payment_id)
    verification = reconcile_service.reconcile_payment(db, payment)
    return VerificationResponse(**verification.to_dict())


@router.post("/{payment_id}/receipt")
async def upload_merchant_receipt(
    payment_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload transfer receipt directly from merchant view and extract AI Vision / OCR fields."""
    payment = payment_service.get_payment_by_id(db, payment_id)

    # Save file
    filename, file_path, size_bytes = await storage_service.save_upload_file(file)
    preview_url = storage_service.get_preview_url(filename)

    # Run AI Vision / OCR
    extracted = ocr_service.process_receipt(file_path, file.content_type or "image/png")

    field_ev_str = json.dumps(extracted.field_evidence) if extracted.field_evidence else None
    auth_ind_str = json.dumps(extracted.authenticity_indicators) if extracted.authenticity_indicators else None
    missing_str = json.dumps(extracted.missing_fields) if extracted.missing_fields else None

    # Upsert Receipt record
    if payment.receipt:
        rec = payment.receipt
        rec.original_filename = file.filename or "receipt.png"
        rec.mime_type = file.content_type or "image/png"
        rec.size_bytes = size_bytes
        rec.storage_path = file_path
        rec.preview_url = preview_url
        rec.amount = extracted.amount or payment.amount
        rec.currency = extracted.currency or payment.currency
        rec.reference = extracted.transaction_reference or f"NIP/WEMA/{payment.reference}"
        rec.bank = extracted.bank_name or "Wema Bank / ALAT"
        rec.status_text = extracted.status_text or "Successful Transaction"
        rec.sender_name = extracted.sender_name or payment.customer_name
        rec.recipient_name = extracted.recipient_name or (current_user.account_name if current_user else "Merchant")
        rec.account_hint = extracted.recipient_account or (current_user.wema_account_number if current_user else "0123456789")
        rec.sender_account = extracted.sender_account
        rec.transaction_time = extracted.transaction_time
        rec.confidence = extracted.confidence
        rec.raw_text = extracted.raw_text
        rec.field_evidence_json = field_ev_str
        rec.authenticity_indicators_json = auth_ind_str
        rec.missing_fields_json = missing_str
        rec.backend_validation_status = extracted.backend_validation_status
    else:
        rec = Receipt(
            payment_id=payment.id,
            original_filename=file.filename or "receipt.png",
            mime_type=file.content_type or "image/png",
            size_bytes=size_bytes,
            storage_path=file_path,
            preview_url=preview_url,
            amount=extracted.amount or payment.amount,
            currency=extracted.currency or payment.currency,
            reference=extracted.transaction_reference or f"NIP/WEMA/{payment.reference}",
            bank=extracted.bank_name or "Wema Bank / ALAT",
            status_text=extracted.status_text or "Successful Transaction",
            sender_name=extracted.sender_name or payment.customer_name,
            recipient_name=extracted.recipient_name or (current_user.account_name if current_user else "Merchant"),
            account_hint=extracted.recipient_account or (current_user.wema_account_number if current_user else "0123456789"),
            sender_account=extracted.sender_account,
            transaction_time=extracted.transaction_time,
            confidence=extracted.confidence,
            raw_text=extracted.raw_text,
            field_evidence_json=field_ev_str,
            authenticity_indicators_json=auth_ind_str,
            missing_fields_json=missing_str,
            backend_validation_status=extracted.backend_validation_status,
        )
        db.add(rec)

    db.commit()
    db.refresh(rec)

    # Run Reconciliation
    verification = reconcile_service.reconcile_payment(db, payment, extracted_receipt=rec)
    return rec.to_dict()
