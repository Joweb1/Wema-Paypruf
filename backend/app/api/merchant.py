from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.dependencies import (
    get_app_settings,
    get_current_user,
    get_session,
    require_current_user,
)
from backend.app.core.config import Settings
from backend.app.core.errors import AppError
from backend.app.core.validation import ValidationError
from backend.app.models import MerchantProfile, User
from backend.app.schemas.api import (
    MerchantMeResponse,
    MerchantProfileResponse,
    OnboardingRequest,
)
from backend.app.services import auth as auth_service

router = APIRouter(prefix="/api/merchant")

SettingsDependency = Annotated[Settings, Depends(get_app_settings)]
SessionDependency = Annotated[Session, Depends(get_session)]


def _profile_response(user: User, profile: MerchantProfile | None) -> dict[str, object]:
    return {
        "user": auth_service.serialize_user(user),
        "profile": (
            MerchantProfileResponse.model_validate(auth_service.profile_to_response(profile, user))
            if profile
            else None
        ),
    }


@router.get("/me", response_model=MerchantMeResponse)
def merchant_me(
    user: Annotated[User, Depends(require_current_user)],
    session: SessionDependency,
) -> dict[str, object]:
    session.refresh(user)
    return _profile_response(user, user.profile)


@router.post("/onboarding", response_model=MerchantMeResponse, status_code=200)
def complete_onboarding(
    payload: OnboardingRequest,
    user: Annotated[User, Depends(require_current_user)],
    session: SessionDependency,
) -> dict[str, object]:
    # Users who registered with a Wema account must keep that same number.
    if user.wema_account_number and payload.wemaAccountNumber != user.wema_account_number:
        raise AppError(
            422,
            "VALIDATION_ERROR",
            "Use the Wema account you registered with.",
            {"field": "wemaAccountNumber"},
        )
    try:
        profile = auth_service.complete_onboarding(
            session,
            user,
            wema_account_number=payload.wemaAccountNumber,
            account_name=payload.accountName,
        )
    except ValidationError as exc:
        raise AppError(422, "VALIDATION_ERROR", exc.message, {"field": exc.field})
    if payload.businessName:
        profile.business_name = payload.businessName
        session.commit()
        session.refresh(profile)
    return _profile_response(user, profile)


@router.get("/me-open", response_model=MerchantMeResponse)
def merchant_me_open(
    user: Annotated[User | None, Depends(get_current_user)],
) -> dict[str, object]:
    """Optional unauthenticated probe used by the onboarding UI to avoid errors."""
    if user is None:
        return {"user": None, "profile": None}
    return _profile_response(user, user.profile)
