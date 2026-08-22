"""Authentication, User Registration, and Session Management Service."""

from __future__ import annotations

import re
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, MerchantDirectory
from app.schemas.auth import LoginRequest, RegisterRequest, OnboardingRequest, AuthResponse, UserResponse


class AuthService:
    """Handles multi-identifier authentication (Wema, email, phone) and merchant profiles."""

    def find_user_by_identifier(self, db: Session, identifier: str) -> Optional[User]:
        """Search user by email, phone, 10-digit Wema account number, or user ID."""
        clean_id = identifier.strip().lower()
        clean_digits = re.sub(r"\D", "", identifier)

        # Exact match queries
        query = db.query(User).filter(
            or_(
                User.email == clean_id,
                User.id == clean_id,
                (User.phone == clean_id) if clean_id else False,
                (User.phone == clean_digits) if clean_digits else False,
                (User.wema_account_number == clean_digits) if clean_digits else False,
            )
        )
        return query.first()

    def login(self, db: Session, req: LoginRequest) -> AuthResponse:
        """Authenticate user and return access token."""
        identifier = req.identifier.strip()
        password = req.password

        if not identifier or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter your account identifier and password."
            )

        user = self.find_user_by_identifier(db, identifier)
        if not user:
            # Check demo credentials fallback
            is_demo = (
                identifier in ["0123456789", "08012345678", "usr_wema_demo_01"] or
                identifier.lower() == "tolafashion@example.com"
            )
            if is_demo and password in ["demopassword123", "password123"]:
                user = db.query(User).filter(User.id == "usr_wema_demo_01").first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found matching this identifier. Please check your details or register."
            )

        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid login credentials. Please check your password."
            )

        token = create_access_token(
            subject=user.id,
            email=user.email,
            wemaAccountNumber=user.wema_account_number
        )

        return AuthResponse(
            user=UserResponse(**user.to_dict()),
            token=token
        )

    def register(self, db: Session, req: RegisterRequest) -> AuthResponse:
        """Register a new merchant account."""
        clean_id = req.identifier.strip()
        full_name = req.fullName.strip()

        if not full_name or not clean_id or not req.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All fields are required."
            )

        if req.confirmPassword and req.password != req.confirmPassword:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match."
            )

        # Check existing
        existing = self.find_user_by_identifier(db, clean_id)
        if existing:
            method_name = "email" if req.method == "email" else ("phone number" if req.method == "phone" else "account number")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account is already registered with this {method_name}. Please sign in instead."
            )

        email = clean_id if req.method == "email" else f"{re.sub(r'\\D', '', clean_id) or 'user'}@paypruf.ng"
        phone = clean_id if req.method == "phone" else ""
        wema_acc = clean_id if req.method == "wema" else ""
        onboarding_done = (req.method == "wema" and len(clean_id) == 10)

        hashed = hash_password(req.password)
        new_user = User(
            full_name=full_name,
            email=email,
            phone=phone,
            wema_account_number=wema_acc,
            account_name=full_name,
            business_name=full_name,
            hashed_password=hashed,
            merchant_onboarding_completed=onboarding_done
        )
        db.add(new_user)
        db.flush()

        # Mirror in Merchant Directory if Wema number provided
        if wema_acc:
            dir_entry = db.query(MerchantDirectory).filter(MerchantDirectory.account_number == wema_acc).first()
            if not dir_entry:
                dir_entry = MerchantDirectory(
                    account_number=wema_acc,
                    account_name=full_name,
                    business_name=full_name,
                    bank_name="Wema Bank / ALAT",
                    registered=True
                )
                db.add(dir_entry)

        db.commit()
        db.refresh(new_user)

        token = create_access_token(
            subject=new_user.id,
            email=new_user.email,
            wemaAccountNumber=new_user.wema_account_number
        )

        return AuthResponse(
            user=UserResponse(**new_user.to_dict()),
            token=token
        )

    def complete_onboarding(self, db: Session, user: User, req: OnboardingRequest) -> UserResponse:
        """Complete merchant settlement onboarding."""
        clean_acc = req.wemaAccountNumber.strip()
        user.wema_account_number = clean_acc
        user.account_name = req.accountName.strip()
        user.business_name = (req.businessName or req.accountName).strip()
        user.merchant_onboarding_completed = True

        # Register in directory
        dir_entry = db.query(MerchantDirectory).filter(MerchantDirectory.account_number == clean_acc).first()
        if not dir_entry:
            dir_entry = MerchantDirectory(
                account_number=clean_acc,
                account_name=user.account_name,
                business_name=user.business_name,
                bank_name="Wema Bank / ALAT",
                registered=True
            )
            db.add(dir_entry)
        else:
            dir_entry.account_name = user.account_name
            dir_entry.business_name = user.business_name
            dir_entry.registered = True

        db.commit()
        db.refresh(user)
        return UserResponse(**user.to_dict())


auth_service = AuthService()
