"""
Simple Firestore-based authentication for PayPruf.

Users sign up / log in with email, phone, or Wema account number + password.
Sessions are stored in the Firestore `sessions` collection.
The frontend sends the session token as:  Authorization: Bearer <token>
"""
import hashlib
import secrets
from functools import wraps
from flask import request, jsonify
import logging

logger = logging.getLogger(__name__)


def _hash_password(password: str) -> str:
    """Hash a password using SHA-256 + a 16-byte hex salt."""
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"


def _check_password(password: str, stored: str) -> bool:
    """Verify a password against a stored hash produced by _hash_password."""
    try:
        salt, expected = stored.split("$", 1)
        h = hashlib.sha256((salt + password).encode()).hexdigest()
        return h == expected
    except (ValueError, AttributeError):
        return False


def create_session(uid: str) -> str:
    """Create a session token for the given merchant UID and persist in Firestore."""
    from app.firebase.firestore import firestore_service
    token = secrets.token_urlsafe(48)
    firestore_service.create_session(token, uid)
    return token


def get_session_uid(token: str) -> str | None:
    """Look up a session token and return the associated merchant UID, or None."""
    from app.firebase.firestore import firestore_service
    return firestore_service.get_session_uid(token)


def delete_session(token: str) -> None:
    """Remove a session token (logout)."""
    from app.firebase.firestore import firestore_service
    firestore_service.delete_session(token)


def require_auth(f):
    """
    Decorator that requires a valid session token.

    On success, attaches these to the Flask request object:
        request.uid       — merchant uid (str)
        request.merchant  — full merchant document (dict or None if not found)

    Usage:
        @app.route('/protected')
        @require_auth
        def my_route():
            return {"uid": request.uid}
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            return jsonify({"error": "Authorization header is missing"}), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid authorization header format. Use: Bearer <token>"}), 401

        token = parts[1]

        # Look up session in Firestore
        try:
            uid = get_session_uid(token)
        except Exception:
            return jsonify({"error": "Internal authentication error"}), 500

        if uid is None:
            return jsonify({"error": "Invalid or expired session"}), 401

        request.uid = uid
        request.merchant = None  # can be lazily populated by routes if needed

        # Optionally load the merchant document
        try:
            from app.firebase.firestore import firestore_service
            merchant = firestore_service.get_merchant_by_uid(uid)
            if merchant:
                request.merchant = merchant
        except Exception:
            pass  # non-critical — route can look up merchant itself

        return f(*args, **kwargs)

    return decorated_function