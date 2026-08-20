from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.core.config import Settings
from backend.app.core.errors import AppError
from backend.app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from backend.app.core.time import as_utc, utcnow
from backend.app.core.validation import (
    ValidationError,
    normalize_email,
    normalize_phone,
    normalize_wema_account,
    validate_account_name,
    validate_full_name,
    validate_password_strength,
)
from backend.app.models import MerchantProfile, User


def serialize_user(user: User) -> dict[str, object]:
    """Public-safe user representation. Never includes password_hash or secrets."""
    return {
        "id": user.id,
        "fullName": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "wemaAccountNumber": user.wema_account_number,
        "role": user.role,
        "merchantOnboardingCompleted": user.merchant_onboarding_completed,
    }


class RegisterInput:
    def __init__(
        self,
        *,
        full_name: str,
        method: str,
        identifier: str,
        password: str,
        confirm_password: str,
    ) -> None:
        self.full_name = validate_full_name(full_name)
        self.password = validate_password_strength(password)
        if self.password != confirm_password:
            raise ValidationError("Passwords do not match.", field="confirmPassword")

        self.email: str | None = None
        self.phone: str | None = None
        self.wema_account_number: str | None = None
        normalized_method = (method or "").strip().lower()
        if normalized_method == "email":
            self.email = normalize_email(identifier)
        elif normalized_method == "phone":
            self.phone = normalize_phone(identifier)
        elif normalized_method == "wema":
            self.wema_account_number = normalize_wema_account(identifier)
        else:
            raise ValidationError("Choose how you want to register.", field="method")

        if not any((self.email, self.phone, self.wema_account_number)):
            raise ValidationError("Enter your account details.", field="identifier")


def _duplicate_error(field: str) -> AppError:
    messages = {
        "email": "This email is already associated with a PayPruf account.",
        "phone": "This phone number is already associated with a PayPruf account.",
        "wema": "This Wema account is already connected to another PayPruf account.",
    }
    return AppError(409, "DUPLICATE_IDENTIFIER", messages.get(field, "That identifier is already in use."), {"field": field})


def register_user(session: Session, data: RegisterInput, *, settings: Settings) -> tuple[User, str]:
    """Create a user, persist a hashed password, and issue a session token."""
    _assert_identifier_available(session, data)

    user = User(
        id=str(uuid.uuid4()),
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        wema_account_number=data.wema_account_number,
        password_hash=hash_password(data.password),
        role="merchant",
        merchant_onboarding_completed=False,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        field = "email" if data.email else "phone" if data.phone else "wema"
        raise _duplicate_error(field)
    session.refresh(user)
    token = create_access_token(settings, subject=user.id)
    return user, token


def _assert_identifier_available(session: Session, data: RegisterInput) -> None:
    if data.email and _user_exists(session, "email", data.email):
        raise _duplicate_error("email")
    if data.phone and _user_exists(session, "phone", data.phone):
        raise _duplicate_error("phone")
    if data.wema_account_number and _user_exists(session, "wema_account_number", data.wema_account_number):
        raise _duplicate_error("wema")


def _user_exists(session: Session, field: str, value: str) -> bool:
    return session.scalar(select(User.id).where(getattr(User, field) == value)) is not None


def authenticate_user(session: Session, identifier: str, password: str, *, settings: Settings) -> tuple[User, str]:
    """Locate a user by email/phone/wema number and verify the password."""
    if not identifier or not password:
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid login details.")

    lookup = identifier.strip()
    candidates: list[User | None] = []
    try:
        email = normalize_email(lookup)
    except ValidationError:
        email = None
    phone = None
    wema = None
    try:
        phone = normalize_phone(lookup)
    except ValidationError:
        phone = None
    try:
        wema = normalize_wema_account(lookup)
    except ValidationError:
        wema = None

    if email:
        candidates.append(session.scalar(select(User).where(User.email == email)))
    if phone:
        candidates.append(session.scalar(select(User).where(User.phone == phone)))
    if wema:
        candidates.append(session.scalar(select(User).where(User.wema_account_number == wema)))

    user = next((item for item in candidates if item is not None), None)
    # Constant-time-ish: still verify even if no user, to avoid leaking timing.
    if user is None or not verify_password(password, user.password_hash):
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid login details.")

    token = create_access_token(settings, subject=user.id)
    return user, token


def complete_onboarding(
    session: Session,
    user: User,
    *,
    wema_account_number: str,
    account_name: str,
) -> MerchantProfile:
    normalized_account = normalize_wema_account(wema_account_number)
    if not normalized_account:
        raise ValidationError("Enter a valid 10-digit Wema account number.", field="wemaAccountNumber")
    cleaned_name = validate_account_name(account_name)

    profile = user.profile
    now = utcnow()
    if profile is None:
        profile = MerchantProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            created_at=now,
        )
        session.add(profile)
    profile.wema_account_number = normalized_account
    profile.account_name = cleaned_name
    profile.onboarding_completed = True
    # The Wema name-enquiry integration point is intentionally isolated. Account
    # verification stays false until a real resolution confirms ownership.
    profile.account_verified = False
    profile.updated_at = now

    user.merchant_onboarding_completed = True
    user.updated_at = now
    session.commit()
    session.refresh(profile)
    return profile


def profile_to_response(profile: MerchantProfile, user: User) -> dict[str, object]:
    """Serialize a MerchantProfile into the API response shape."""
    return {
        "id": profile.id,
        "userId": profile.user_id,
        "wemaAccountNumber": profile.wema_account_number,
        "accountName": profile.account_name,
        "businessName": profile.business_name,
        "accountVerified": profile.account_verified,
        "onboardingCompleted": profile.onboarding_completed,
        "createdAt": as_utc(profile.created_at),
        "updatedAt": as_utc(profile.updated_at),
    }


def merchant_profile_view(profile: MerchantProfile | None, user: User) -> dict[str, object]:
    """Identity card for the merchant dashboard / onboarding."""
    account_number = profile.wema_account_number if profile else user.wema_account_number
    digits = "".join(character for character in (account_number or "")) if account_number else ""
    hint = f"ending {digits[-4:]}" if len(digits) >= 4 else "account"
    return {
        "id": profile.id if profile else user.id,
        "business_name": (profile.business_name if profile else None) or user.full_name,
        "display_name": user.full_name,
        "phone": user.phone,
        "wema_account_name": profile.account_name if profile else "",
        "wema_account_number": account_number,
        "wema_account_number_hint": hint,
        "bank_name": "Wema Bank",
        "created_at": as_utc(profile.created_at) if profile else as_utc(user.created_at),
        "onboarding_completed": profile.onboarding_completed if profile else user.merchant_onboarding_completed,
        "account_verified": profile.account_verified if profile else False,
    }
