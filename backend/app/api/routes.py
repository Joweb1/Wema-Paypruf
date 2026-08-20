from __future__ import annotations

import logging
from pathlib import Path
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from backend.app.api.dependencies import (
    get_app_settings,
    get_receipt_extractor,
    get_session,
    get_wema_provider,
    require_current_user,
)
from backend.app.core.config import Settings
from backend.app.core.enums import PaymentStatus
from backend.app.core.errors import AppError
from backend.app.models import PaymentRequest, User
from backend.app.providers.wema import WemaTransactionProvider
from backend.app.schemas.api import (
    DashboardSummaryResponse,
    HealthResponse,
    MerchantUploadResponse,
    PaymentCreate,
    PaymentDetailResponse,
    PaymentListResponse,
    PaymentSummary,
    PublicPaymentDetailResponse,
    PublicUploadResponse,
    VerificationResponse,
)
from backend.app.services.auth import merchant_profile_view
from backend.app.services.matching import verify_payment
from backend.app.services.normalization import minor_to_money
from backend.app.services.payments import (
    create_payment,
    get_current_receipt,
    get_current_verification,
    get_payment,
    get_public_payment,
    list_payments,
    record_first_open,
)
from backend.app.services.serialization import (
    is_expired,
    merchant_view,
    payment_instructions,
    payment_view,
    receipt_view,
    timeline_view,
    transaction_view,
    verification_view,
)
from backend.app.services.uploads import process_receipt_upload, safe_receipt_path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")
SessionDependency = Annotated[Session, Depends(get_session)]
SettingsDependency = Annotated[Settings, Depends(get_app_settings)]
ProviderDependency = Annotated[WemaTransactionProvider, Depends(get_wema_provider)]
ExtractorDependency = Annotated[Any, Depends(get_receipt_extractor)]


def _ensure_not_expired(payment: PaymentRequest) -> None:
    if is_expired(payment):
        raise AppError(
            410,
            "PAYMENT_EXPIRED",
            "This payment request has expired. Ask the merchant for a new payment link.",
        )


def _payment_detail(
    session: Session,
    payment: PaymentRequest,
    settings: Settings,
) -> dict[str, Any]:
    receipt = get_current_receipt(session, payment.id)
    verification = get_current_verification(session, payment.id)
    transaction = verification.transaction if verification else None
    return {
        "payment": payment_view(payment, settings),
        "merchant": merchant_view(payment.merchant),
        "receipt": receipt_view(payment, receipt) if receipt else None,
        "verification": (
            verification_view(payment, verification) if verification else None
        ),
        "transaction": transaction_view(transaction),
        "timeline": timeline_view(payment, receipt, verification),
    }


def _public_payment_detail(
    session: Session,
    payment: PaymentRequest,
    settings: Settings,
) -> dict[str, Any]:
    receipt = get_current_receipt(session, payment.id)
    verification = get_current_verification(session, payment.id)
    return {
        "payment": payment_view(payment, settings, public=True),
        "merchant": merchant_view(payment.merchant, public=True),
        "payment_instructions": payment_instructions(payment.merchant),
        "receipt": receipt_view(payment, receipt, public=True) if receipt else None,
        "verification": (
            verification_view(payment, verification, public=True) if verification else None
        ),
    }


@router.get("/health", response_model=HealthResponse)
def health(
    session: SessionDependency,
    settings: SettingsDependency,
    provider: ProviderDependency,
) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "database": "ok",
        "wema_provider": provider.mode,
        "ocr_provider": settings.ocr_provider,
    }


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(
    session: SessionDependency,
    settings: SettingsDependency,
    user: Annotated[User, Depends(require_current_user)],
) -> dict[str, Any]:
    # Payment stats remain scoped to the active merchant tenant; the identity card
    # reflects the authenticated merchant's profile.
    payments = list(
        session.scalars(
            select(PaymentRequest).order_by(PaymentRequest.created_at.desc())
        ).all()
    )

    def bucket(status: PaymentStatus | None = None) -> dict[str, Any]:
        selected = payments if status is None else [item for item in payments if item.status == status]
        return {
            "count": len(selected),
            "value": minor_to_money(sum(item.amount_minor for item in selected)),
        }

    return {
        "merchant": merchant_profile_view(user.profile, user),
        "total": bucket(),
        "confirmed": bucket(PaymentStatus.CONFIRMED),
        "pending": bucket(PaymentStatus.PENDING),
        "mismatch": bucket(PaymentStatus.MISMATCH),
        "not_received": bucket(PaymentStatus.NOT_RECEIVED),
        "recent_payments": [payment_view(item, settings) for item in payments[:10]],
    }


@router.post("/payments", response_model=PaymentSummary, status_code=201)
def create_payment_route(
    data: PaymentCreate,
    session: SessionDependency,
    settings: SettingsDependency,
) -> dict[str, Any]:
    payment = create_payment(session, data)
    logger.info(
        "payment_created",
        extra={"event": "payment_created", "payment_id": payment.id},
    )
    return payment_view(payment, settings)


@router.get("/payments", response_model=PaymentListResponse)
def payments_list(
    session: SessionDependency,
    settings: SettingsDependency,
    status: PaymentStatus | None = None,
    search: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    items, total = list_payments(
        session, status=status, search=search, limit=limit, offset=offset
    )
    return {"items": [payment_view(item, settings) for item in items], "total": total}


@router.get("/payments/{payment_id}", response_model=PaymentDetailResponse)
def payment_detail(
    payment_id: UUID,
    session: SessionDependency,
    settings: SettingsDependency,
) -> dict[str, Any]:
    return _payment_detail(session, get_payment(session, str(payment_id)), settings)


async def _upload_receipt(
    payment: PaymentRequest,
    file: UploadFile,
    session: Session,
    settings: Settings,
    extractor: Any,
    *,
    public: bool,
) -> tuple[dict[str, Any], bool]:
    receipt, created = await process_receipt_upload(
        session, payment, file, extractor, settings
    )
    return {
        "payment": payment_view(payment, settings, public=public),
        "receipt": receipt_view(payment, receipt, public=public),
    }, created


@router.post(
    "/payments/{payment_id}/receipt",
    response_model=MerchantUploadResponse,
    status_code=201,
)
async def merchant_receipt_upload(
    payment_id: UUID,
    response: Response,
    session: SessionDependency,
    settings: SettingsDependency,
    extractor: ExtractorDependency,
    file: Annotated[UploadFile, File(...)],
) -> dict[str, Any]:
    payload, created = await _upload_receipt(
        get_payment(session, str(payment_id)),
        file,
        session,
        settings,
        extractor,
        public=False,
    )
    response.status_code = 201 if created else 200
    return payload


def _run_verification(
    session: Session,
    payment: PaymentRequest,
    provider: WemaTransactionProvider,
) -> VerificationResponse:
    verification = verify_payment(session, payment, provider)
    return VerificationResponse.model_validate(
        verification_view(payment, verification, public=True)
    )


@router.post("/payments/{payment_id}/verify", response_model=VerificationResponse)
def merchant_verify(
    payment_id: UUID,
    session: SessionDependency,
    provider: ProviderDependency,
) -> VerificationResponse:
    return _run_verification(session, get_payment(session, str(payment_id)), provider)


@router.post("/payments/{payment_id}/recheck", response_model=VerificationResponse)
def merchant_recheck(
    payment_id: UUID,
    session: SessionDependency,
    provider: ProviderDependency,
) -> VerificationResponse:
    return _run_verification(session, get_payment(session, str(payment_id)), provider)


@router.get("/payments/{payment_id}/verification", response_model=VerificationResponse)
def merchant_verification(
    payment_id: UUID,
    session: SessionDependency,
) -> dict[str, Any]:
    payment = get_payment(session, str(payment_id))
    verification = get_current_verification(session, payment.id)
    if verification is None:
        raise AppError(
            404,
            "VERIFICATION_NOT_FOUND",
            "This payment has not been verified yet.",
        )
    return verification_view(payment, verification)


def _receipt_file_response(receipt_path: Path, mime_type: str, filename: str) -> FileResponse:
    return FileResponse(
        receipt_path,
        media_type=mime_type,
        filename=filename,
        content_disposition_type="inline",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )


@router.get("/payments/{payment_id}/receipt/file", response_class=FileResponse)
def merchant_receipt_file(
    payment_id: UUID,
    session: SessionDependency,
    settings: SettingsDependency,
) -> FileResponse:
    payment = get_payment(session, str(payment_id))
    receipt = get_current_receipt(session, payment.id)
    if receipt is None:
        raise AppError(404, "RECEIPT_NOT_FOUND", "No receipt has been uploaded yet.")
    return _receipt_file_response(
        safe_receipt_path(receipt, settings), receipt.mime_type, receipt.original_filename
    )


@router.get("/public/payments/{token}", response_model=PublicPaymentDetailResponse)
def public_payment_detail(
    token: str,
    session: SessionDependency,
    settings: SettingsDependency,
) -> dict[str, Any]:
    payment = get_public_payment(session, token)
    record_first_open(session, payment)
    return _public_payment_detail(session, payment, settings)


@router.post(
    "/public/payments/{token}/receipt",
    response_model=PublicUploadResponse,
    status_code=201,
)
async def public_receipt_upload(
    token: str,
    response: Response,
    session: SessionDependency,
    settings: SettingsDependency,
    extractor: ExtractorDependency,
    file: Annotated[UploadFile, File(...)],
) -> dict[str, Any]:
    payment = get_public_payment(session, token)
    _ensure_not_expired(payment)
    payload, created = await _upload_receipt(
        payment, file, session, settings, extractor, public=True
    )
    response.status_code = 201 if created else 200
    return payload


def _public_verification(
    token: str,
    session: Session,
    provider: WemaTransactionProvider,
) -> VerificationResponse:
    payment = get_public_payment(session, token)
    _ensure_not_expired(payment)
    return _run_verification(session, payment, provider)


@router.post("/public/payments/{token}/verify", response_model=VerificationResponse)
def public_verify(
    token: str,
    session: SessionDependency,
    provider: ProviderDependency,
) -> VerificationResponse:
    return _public_verification(token, session, provider)


@router.post("/public/payments/{token}/recheck", response_model=VerificationResponse)
def public_recheck(
    token: str,
    session: SessionDependency,
    provider: ProviderDependency,
) -> VerificationResponse:
    return _public_verification(token, session, provider)


@router.get("/public/payments/{token}/receipt/file", response_class=FileResponse)
def public_receipt_file(
    token: str,
    session: SessionDependency,
    settings: SettingsDependency,
) -> FileResponse:
    payment = get_public_payment(session, token)
    receipt = get_current_receipt(session, payment.id)
    if receipt is None:
        raise AppError(404, "RECEIPT_NOT_FOUND", "No receipt has been uploaded yet.")
    return _receipt_file_response(
        safe_receipt_path(receipt, settings), receipt.mime_type, receipt.original_filename
    )

