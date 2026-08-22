"""Merchant Profile, Onboarding, and Dashboard Analytics Endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import OnboardingRequest, MerchantProfileResponse
from app.schemas.payment import DashboardResponse
from app.services.auth_service import auth_service
from app.services.payment_service import payment_service

router = APIRouter(prefix="/merchant", tags=["Merchant"])


@router.get("/profile", response_model=MerchantProfileResponse)
def get_merchant_profile(
    current_user: User = Depends(get_current_user)
):
    """Get active merchant settlement profile."""
    return {
        "profile": {
            "id": current_user.id,
            "wemaAccountNumber": current_user.wema_account_number or "0123456789",
            "accountName": current_user.account_name or current_user.full_name or "Tola Fashion Enterprise",
            "businessName": current_user.business_name or "Tola Fashion",
            "email": current_user.email,
            "phone": current_user.phone,
        }
    }


@router.post("/onboarding")
def complete_onboarding(
    req: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Link settlement Wema Bank account."""
    updated_user = auth_service.complete_onboarding(db, current_user, req)
    return {"user": updated_user}


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve dashboard summary counts, values, and recent payments."""
    return payment_service.get_dashboard(db, current_user)
