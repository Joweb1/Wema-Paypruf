from __future__ import annotations

from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from backend.app.core.config import Settings
from backend.app.core.errors import AppError
from backend.app.core.security import decode_access_token
from backend.app.models import User
from backend.app.providers.wema import WemaTransactionProvider


def get_session(request: Request) -> Generator[Session, None, None]:
    session = request.app.state.database.session_factory()
    try:
        yield session
    finally:
        session.close()


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_wema_provider(request: Request) -> WemaTransactionProvider:
    return request.app.state.wema_provider


def get_receipt_extractor(request: Request):
    return request.app.state.receipt_extractor


def get_current_user(request: Request, session: Annotated[Session, Depends(get_session)]) -> User | None:
    """Resolve the authenticated user from the HttpOnly session cookie, if any."""
    settings: Settings = request.app.state.settings
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        return None
    try:
        payload = decode_access_token(settings, token)
        subject = payload.get("sub")
    except jwt.PyJWTError:
        return None
    if not subject:
        return None
    return session.get(User, subject)


def require_current_user(
    request: Request,
    user: Annotated[User | None, Depends(get_current_user)],
) -> User:
    if user is None:
        raise AppError(401, "AUTH_REQUIRED", "Your session has expired. Please sign in again.")
    return user


def require_onboarding(user: Annotated[User, Depends(require_current_user)]) -> User:
    if not user.merchant_onboarding_completed:
        raise AppError(
            403,
            "ONBOARDING_REQUIRED",
            "Complete your merchant setup to continue.",
        )
    return user

