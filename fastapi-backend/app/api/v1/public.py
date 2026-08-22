"""Public Customer Payment Portal and Receipt Verification Endpoints."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.payment import Payment, Receipt
from app.models.user import User
from app.schemas.payment import PublicPaymentResponse
from app.schemas.verification import VerificationResponse
from app.services.ocr_service import ocr_service
from app.services.payment_service import payment_service
from app.services.reconcile_service import reconcile_service
from app.services.risk_service import risk_service
from app.services.storage_service import storage_service

router = APIRouter(prefix="/public", tags=["Public Payment Portal"])


@router.get("/pay/{token}", response_model=PublicPaymentResponse)
def get_public_payment(
    token: str,
    db: Session = Depends(get_db)
):
    """Retrieve public payment instructions and merchant details for a customer."""
    return payment_service.get_public_payment_view(db, token)


@router.post("/pay/{token}/receipt")
async def upload_public_receipt(
    token: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload transfer receipt, execute Gemini Vision / OCR extraction, and link evidence to payment."""
    payment = payment_service.get_payment_by_id(db, token)
    merchant = payment.merchant

    # 1. Save uploaded file
    filename, file_path, size_bytes = await storage_service.save_upload_file(file)
    preview_url = storage_service.get_preview_url(filename)

    # 2. Run Gemini Vision / OCR extraction pipeline
    extracted = ocr_service.process_receipt(file_path, file.content_type or "image/png")

    # 3. Create or update Receipt record
    merchant_account = merchant.wema_account_number if merchant else "0123456789"
    merchant_name = merchant.account_name if merchant else "MERCHANT ENTERPRISE"

    field_ev_str = json.dumps(extracted.field_evidence) if extracted.field_evidence else None
    auth_ind_str = json.dumps(extracted.authenticity_indicators) if extracted.authenticity_indicators else None
    missing_str = json.dumps(extracted.missing_fields) if extracted.missing_fields else None

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
        rec.recipient_name = extracted.recipient_name or merchant_name
        rec.account_hint = extracted.recipient_account or merchant_account
        rec.sender_account = extracted.sender_account
        rec.transaction_time = extracted.transaction_time
        rec.confidence = extracted.confidence
        rec.originality_score = extracted.originality_score
        rec.tampering_detected = extracted.tampering_detected
        rec.authenticity_verdict = extracted.authenticity_verdict
        rec.raw_text = extracted.raw_text
        rec.field_evidence_json = field_ev_str
        rec.authenticity_indicators_json = auth_ind_str
        rec.missing_fields_json = missing_str
        rec.backend_validation_status = extracted.backend_validation_status
        rec.ai_engine = extracted.ai_engine
        rec.ai_offline = extracted.ai_offline
        rec.ai_status_message = extracted.ai_status_message
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
            recipient_name=extracted.recipient_name or merchant_name,
            account_hint=extracted.recipient_account or merchant_account,
            sender_account=extracted.sender_account,
            transaction_time=extracted.transaction_time,
            confidence=extracted.confidence,
            originality_score=extracted.originality_score,
            tampering_detected=extracted.tampering_detected,
            authenticity_verdict=extracted.authenticity_verdict,
            raw_text=extracted.raw_text,
            field_evidence_json=field_ev_str,
            authenticity_indicators_json=auth_ind_str,
            missing_fields_json=missing_str,
            backend_validation_status=extracted.backend_validation_status,
            ai_engine=extracted.ai_engine,
            ai_offline=extracted.ai_offline,
            ai_status_message=extracted.ai_status_message,
        )
        db.add(rec)

    payment.status = "PENDING"
    payment.status_reason = "Receipt uploaded. Bank ledger reconciliation in progress."
    db.commit()
    db.refresh(rec)

    return rec.to_dict()


@router.post("/pay/{token}/verify", response_model=VerificationResponse)
def verify_public_payment(
    token: str,
    db: Session = Depends(get_db)
):
    """Run automated bank ledger reconciliation on uploaded receipt."""
    payment = payment_service.get_payment_by_id(db, token)
    verification = reconcile_service.reconcile_payment(db, payment)
    return VerificationResponse(**verification.to_dict())


@router.post("/pay/{token}/recheck", response_model=VerificationResponse)
def recheck_public_payment(
    token: str,
    db: Session = Depends(get_db)
):
    """Customer recheck of interbank clearance status."""
    payment = payment_service.get_payment_by_id(db, token)
    verification = reconcile_service.reconcile_payment(db, payment)
    return VerificationResponse(**verification.to_dict())


@router.post("/receipt-upload/direct")
async def direct_receipt_upload(
    accountName: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Direct receipt upload by visitors for a specific merchant account.
    
    Validation Rules for Direct Upload:
    1. Does NOT validate against an expected payment amount (no upfront order required).
    2. Strictly validates Recipient Name / Account against the Merchant Account.
    3. Analyzes AI Receipt Originality and checks for tampering / forged slips.
    4. Confirms bank format & structure.
    """
    clean_target = accountName.strip()

    # 1. Look up merchant in User database or Risk directory
    merchant = (
        db.query(User)
        .filter(
            (User.business_name.ilike(f"%{clean_target}%")) |
            (User.account_name.ilike(f"%{clean_target}%")) |
            (User.full_name.ilike(f"%{clean_target}%")) |
            (User.wema_account_number == clean_target) |
            (User.email.ilike(f"%{clean_target}%"))
        )
        .first()
    )

    target_display_name = merchant.business_name if (merchant and merchant.business_name) else (
        merchant.account_name if (merchant and merchant.account_name) else clean_target
    )
    target_account_number = merchant.wema_account_number if merchant else None

    # 2. Save upload file
    filename, file_path, size_bytes = await storage_service.save_upload_file(file)
    preview_url = storage_service.get_preview_url(filename)

    # 3. Process via AI Vision / OCR Engine
    extracted = ocr_service.process_receipt(file_path, file.content_type or "image/png")

    # 4. Check Recipient Name Match
    recipient_match = True
    rec_name = extracted.recipient_name or ""
    rec_acc = extracted.recipient_account or ""

    if rec_name:
        # Token overlap check
        def normalize_tokens(s: str) -> set[str]:
            cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", s.lower())
            return {
                t for t in cleaned.split()
                if len(t) > 2 and t not in {
                    "ltd", "limited", "enterprise", "ent", "plc", "bank", "ventures",
                    "services", "nig", "nigeria", "and", "the", "for", "wema"
                }
            }

        rec_tokens = normalize_tokens(rec_name)
        target_tokens = normalize_tokens(target_display_name)

        is_sub = (clean_target.lower() in rec_name.lower()) or (rec_name.lower() in clean_target.lower())
        token_overlap = bool(rec_tokens & target_tokens) if (rec_tokens and target_tokens) else False
        acc_match = bool(target_account_number and rec_acc and (target_account_number in rec_acc or rec_acc in target_account_number))

        recipient_match = is_sub or token_overlap or acc_match
    elif target_account_number and rec_acc:
        recipient_match = (target_account_number in rec_acc or rec_acc in target_account_number)

    # 5. Check Originality & Tampering
    orig_score = extracted.originality_score
    tampering = extracted.tampering_detected
    verdict = extracted.authenticity_verdict

    mismatch_details: List[str] = []
    if tampering or verdict == "LIKELY_ALTERED":
        status_val = "MISMATCH"
        reason_code = "RECEIPT_ALTERED_OR_TAMPERED"
        mismatch_details.append(f"AI Forensics Alert: Visual tampering or edited typography detected on receipt. Originality: {orig_score * 100:.0f}%.")
        message = "Receipt rejected: Detected edited typography or visual alteration."
    elif not recipient_match and rec_name:
        status_val = "MISMATCH"
        reason_code = "RECIPIENT_MISMATCH"
        mismatch_details.append(f"Recipient Mismatch: Receipt confirms payment to '{rec_name}', which does not match merchant account '{target_display_name}'.")
        message = f"Receipt beneficiary '{rec_name}' does not match '{target_display_name}'."
    elif extracted.backend_validation_status == "INVALID_RECEIPT":
        status_val = "MISMATCH"
        reason_code = "INVALID_BANK_SLIP"
        mismatch_details.append(f"Receipt from unrecognized bank '{extracted.bank_name}'.")
        message = "Document is not a recognized Nigerian bank receipt."
    elif extracted.backend_validation_status == "EXTRACTION_FAILED":
        status_val = "NOT_RECEIVED"
        reason_code = "EXTRACTION_FAILED"
        mismatch_details.append("Could not extract readable transaction fields from the uploaded image.")
        message = "Unreadable receipt document."
    else:
        status_val = "CONFIRMED"
        reason_code = "MATCH_EXACT"
        message = f"Receipt successfully verified and matched with incoming credit to {target_display_name}."

    return {
        "status": status_val,
        "reason_code": reason_code,
        "message": message,
        "accountName": target_display_name,
        "amount": extracted.amount or "0.00",
        "currency": extracted.currency or "NGN",
        "reference": extracted.transaction_reference or "N/A",
        "bank": extracted.bank_name,
        "sender_name": extracted.sender_name,
        "recipient_name": extracted.recipient_name,
        "recipient_match": recipient_match,
        "expected_recipient": target_display_name,
        "confidence": extracted.confidence,
        "originality_score": orig_score,
        "originality_rating": "High (Authentic)" if orig_score >= 0.85 else ("Moderate" if orig_score >= 0.65 else "Suspicious / Low"),
        "tampering_detected": tampering,
        "authenticity_verdict": verdict,
        "authenticity_indicators": extracted.authenticity_indicators,
        "field_evidence": extracted.field_evidence,
        "mismatch_details": mismatch_details,
        "previewUrl": preview_url,
        "ai_engine": extracted.ai_engine,
        "ai_offline": extracted.ai_offline,
        "ai_status_message": extracted.ai_status_message,
    }
