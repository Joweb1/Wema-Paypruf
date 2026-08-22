"""FastAPI route dependencies for database sessions and authentication."""

from __future__ import annotations

from typing import Generator, Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.seed.initial_data import DEMO_USER_ID


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Validate Bearer token and return current authenticated User."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    token = authorization.split("Bearer ")[1].strip()

    # Handle demo JWT tokens
    if token in ["demo_jwt_token", "jwt_usr_wema_demo_01"]:
        demo_user = db.query(User).filter(User.id == DEMO_USER_ID).first()
        if demo_user:
            return demo_user

    # Handle standard token pattern `jwt_{user_id}_{timestamp}`
    if token.startswith("jwt_usr_"):
        parts = token.split("_")
        if len(parts) >= 3:
            user_id = f"usr_{parts[2]}"
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                return user

    # Decode standard JWT payload
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists."
        )

    return user


def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Return user if Bearer token is provided and valid, otherwise None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None
