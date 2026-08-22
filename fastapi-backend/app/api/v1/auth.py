"""Authentication Endpoints."""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_optional_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, AuthResponse, UserResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/session")
def get_session(
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Retrieve active session user or null if unauthenticated."""
    if not current_user:
        return {"user": None}
    return {"user": current_user.to_dict()}


@router.post("/login", response_model=AuthResponse)
def login(
    req: LoginRequest,
    db: Session = Depends(get_db)
):
    """Sign in using Wema account number, email, or phone number + password."""
    return auth_service.login(db, req)


@router.post("/register", response_model=AuthResponse)
def register(
    req: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new PayPruf merchant account."""
    return auth_service.register(db, req)


@router.post("/demo-login", response_model=AuthResponse)
def demo_login(
    db: Session = Depends(get_db)
):
    """Instant sign in as the default demo merchant (Tola Fashion)."""
    return auth_service.login(
        db,
        LoginRequest(identifier="0123456789", password="demopassword123")
    )


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user)
):
    """Log out active session."""
    return {"success": True, "message": "Successfully signed out."}
