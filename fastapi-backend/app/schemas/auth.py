"""Pydantic schemas for Authentication and User management."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Sign-in with any identifier (Wema account, email, or phone) + password."""
    identifier: str = Field(..., description="Wema account number, email address, or phone number")
    password: str = Field(..., min_length=1)


class RegisterRequest(BaseModel):
    """Merchant account registration."""
    fullName: str = Field(..., min_length=2)
    method: str = Field(default="wema")  # wema | email | phone
    identifier: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    confirmPassword: Optional[str] = None


class OnboardingRequest(BaseModel):
    """Settlement account onboarding."""
    wemaAccountNumber: str = Field(..., min_length=10, max_length=10)
    accountName: str = Field(..., min_length=2)
    businessName: Optional[str] = None


class UserResponse(BaseModel):
    """User profile response matching frontend state."""
    id: str
    fullName: str
    email: str
    phone: str
    wemaAccountNumber: str
    accountName: str
    businessName: str
    merchantOnboardingCompleted: bool
    createdAt: Optional[str] = None


class AuthResponse(BaseModel):
    """Login and registration response payload."""
    user: UserResponse
    token: str
    tokenType: str = "Bearer"


class MerchantProfileResponse(BaseModel):
    profile: dict
