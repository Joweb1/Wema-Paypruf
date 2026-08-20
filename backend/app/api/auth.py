from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from backend.app.api.cookies import clear_auth_cookie, set_auth_cookie
from backend.app.api.dependencies import (
    get_app_settings,
    get_session,
    require_current_user,
)
from backend.app.core.config import Settings
from backend.app.core.errors import AppError
from backend.app.core.rate_limit import RateLimiter
from backend.app.core.validation import ValidationError
from backend.app.models import User
from backend.app.schemas.api import (
    AuthUserResponse,
    LoginRequest,
    RegisterRequest,
)
from backend.app.services import auth as auth_service

router = APIRouter(prefix="/api/auth")

# Sensible MVP limits: 12 attempts/minute for login, 8 for register.
login_limiter = RateLimiter(max_requests=12, window_seconds=60)
register_limiter = RateLimiter(max_requests=8, window_seconds=60)

SettingsDependency = Annotated[Settings, Depends(get_app_settings)]
SessionDependency = Annotated[Session, Depends(get_session)]


@router.post("/register", response_model=AuthUserResponse, status_code=201)
def register(
    payload: RegisterRequest,
    response: Response,
    request: Request,
    session: SessionDependency,
    settings: SettingsDependency,
) -> dict[str, object]:
    register_limiter.check(request)
    try:
        data = auth_service.RegisterInput(
            full_name=payload.fullName,
            method=payload.method,
            identifier=payload.identifier,
            password=payload.password,
            confirm_password=payload.confirmPassword,
        )
        user, token = auth_service.register_user(session, data, settings=settings)
    except ValidationError as exc:
        raise AppError(422, "VALIDATION_ERROR", exc.message, {"field": exc.field})
    set_auth_cookie(response, settings, token)
    return auth_service.serialize_user(user)


@router.post("/login", response_model=AuthUserResponse)
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    session: SessionDependency,
    settings: SettingsDependency,
) -> dict[str, object]:
    login_limiter.check(request)
    try:
        user, token = auth_service.authenticate_user(
            session, payload.identifier, payload.password, settings=settings
        )
    except AppError:
        # Normalize every auth failure to a generic message to avoid account enumeration.
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid login details.")
    set_auth_cookie(response, settings, token)
    return auth_service.serialize_user(user)


@router.post("/logout")
def logout(
    response: Response,
    settings: SettingsDependency,
) -> dict[str, str]:
    clear_auth_cookie(response, settings)
    return {"status": "ok"}


@router.get("/me", response_model=AuthUserResponse)
def me(
    user: Annotated[User, Depends(require_current_user)],
) -> dict[str, object]:
    return auth_service.serialize_user(user)
