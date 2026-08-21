from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from backend.app.core.config import Settings

ROUNDS = 12


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with a safe work factor."""
    encoded = password.encode("utf-8")
    return bcrypt.hashpw(encoded, bcrypt.gensalt(rounds=ROUNDS)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time verification of a plaintext password against a hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(settings: Settings, *, subject: str, expires_minutes: int | None = None) -> str:
    """Issue a signed JWT access token stored in an HttpOnly cookie."""
    lifetime = expires_minutes if expires_minutes is not None else settings.jwt_expires_minutes
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=lifetime),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(settings: Settings, token: str) -> dict[str, Any]:
    """Verify and decode a JWT access token. Raises jwt.PyJWTError on failure."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
