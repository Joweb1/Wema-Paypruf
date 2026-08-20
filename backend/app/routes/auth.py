"""
Auth routes — signup, login, logout, and token verification.

Users authenticate with email/phone/wema_account + password.
Sessions are managed via Firestore-backed tokens.
"""
from flask import Blueprint, request, jsonify
from app.firebase.auth import (
    _hash_password,
    _check_password,
    create_session,
    delete_session,
    require_auth,
)
from app.firebase.firestore import firestore_service
from app.utils.validators import validate_email, validate_phone_number, validate_amount
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/auth/signup', methods=['POST'])
def signup():
    """
    Register a new merchant.

    Expected JSON:
    {
        "business_name": "...",
        "email": "...",
        "phone": "...",
        "wema_account": "...",
        "password": "...",
        "bank_name": "...",
        "account_number": "...",
        "account_name": "..."
    }
    At least one of email/phone/wema_account is required.
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        password = data.get("password", "")
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        # At least one identifier is required
        email = data.get("email", "").strip()
        phone = data.get("phone", "").strip()
        wema_account = data.get("wema_account", "").strip()
        if not any([email, phone, wema_account]):
            return jsonify({"error": "At least one of email, phone, or wema_account is required"}), 400

        # Validate email format if provided
        if email and not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Validate phone format if provided
        if phone and not validate_phone_number(phone):
            return jsonify({"error": "Invalid phone number format. Use international format (e.g. +234...)"}), 400

        # Build identifier map — only include non-empty fields
        auth_fields = {}
        if email:
            auth_fields['email'] = email
        if phone:
            auth_fields['phone'] = phone
        if wema_account:
            auth_fields['wema_account'] = wema_account

        # Check for duplicate identifiers
        existing = firestore_service.find_merchant_by_identifier(auth_fields)
        if existing:
            field_name = list(existing.keys())[0]  # the matched field
            return jsonify({"error": f"A merchant with that {field_name} already exists"}), 409

        # Required business fields
        business_name = data.get("business_name", "").strip()
        if not business_name:
            return jsonify({"error": "Business name is required"}), 400

        bank_name = data.get("bank_name", "").strip()
        account_number = data.get("account_number", "").strip()
        account_name = data.get("account_name", "").strip()

        # Generate a unique uid for this merchant
        import secrets
        uid = "m_" + secrets.token_hex(16)

        # Hash password
        hashed = _hash_password(password)

        # Create merchant document
        merchant_data = {
            "uid": uid,
            "business_name": business_name,
            "email": email,
            "phone": phone,
            "wema_account": wema_account,
            "password_hash": hashed,
            "bank_name": bank_name,
            "account_number": account_number,
            "account_name": account_name,
        }

        merchant_id = firestore_service.create_merchant(merchant_data)

        # Create session
        token = create_session(uid)

        return jsonify({
            "uid": uid,
            "merchant_id": merchant_id,
            "token": token,
            "business_name": business_name,
            "email": email,
            "phone": phone,
            "wema_account": wema_account,
            "message": "Merchant registered successfully"
        }), 201

    except Exception as e:
        logger.error("Signup error: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """
    Authenticate an existing merchant.

    Expected JSON:
    {
        "email": "..."    OR "phone": "..."    OR "wema_account": "...",
        "password": "..."
    }
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        password = data.get("password", "")
        if not password:
            return jsonify({"error": "Password is required"}), 400

        # Determine which identifier was provided
        identifier = {}
        for field in ("email", "phone", "wema_account"):
            val = data.get(field, "").strip()
            if val:
                identifier[field] = val

        if not identifier:
            return jsonify({"error": "Provide one of: email, phone, or wema_account"}), 400

        # Look up merchant by identifier
        merchant = firestore_service.find_merchant_by_identifier(identifier)
        if not merchant:
            return jsonify({"error": "Invalid credentials"}), 401

        stored_hash = merchant.get("password_hash")
        if not stored_hash:
            return jsonify({"error": "Account has no password set"}), 401

        if not _check_password(password, stored_hash):
            return jsonify({"error": "Invalid credentials"}), 401

        # Create session
        token = create_session(merchant["uid"])

        return jsonify({
            "uid": merchant["uid"],
            "merchant_id": merchant.get("id"),
            "token": token,
            "business_name": merchant.get("business_name"),
            "email": merchant.get("email"),
            "phone": merchant.get("phone"),
            "message": "Login successful"
        }), 200

    except Exception as e:
        logger.error("Login error: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route('/auth/logout', methods=['POST'])
@require_auth
def logout():
    """Invalidate the current session token."""
    try:
        auth_header = request.headers.get("Authorization", "")
        parts = auth_header.split(" ", 1)
        if len(parts) != 2:
            return jsonify({"error": "Invalid authorization header"}), 401
        token = parts[1]
        delete_session(token)
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        logger.error("Logout error: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route('/auth/me', methods=['GET'])
@require_auth
def me():
    """Return the currently authenticated merchant's profile."""
    try:
        merchant = firestore_service.get_merchant_by_uid(request.uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        return jsonify({
            "uid": merchant.get("uid"),
            "merchant_id": merchant.get("id"),
            "business_name": merchant.get("business_name"),
            "email": merchant.get("email"),
            "phone": merchant.get("phone"),
            "wema_account": merchant.get("wema_account"),
            "bank_name": merchant.get("bank_name"),
            "account_number": merchant.get("account_number"),
            "account_name": merchant.get("account_name"),
            "created_at": merchant.get("created_at"),
        }), 200

    except Exception as e:
        logger.error("Me error: %s", e)
        return jsonify({"error": "Internal server error"}), 500


# Health check endpoint (no auth required)
@auth_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "paypruf-backend"}), 200