"""
Tests for PayPruf backend application.
"""
import json
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _patch_firebase_init():
    """Prevent real Firebase initialization during all tests."""
    with patch("app.firebase.initialize_firebase") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture(autouse=True)
def _patch_firestore():
    """Patch get_firestore so it returns a magic mock in all tests."""
    with patch("app.firebase.get_firestore") as mock:
        mock.return_value = MagicMock()
        yield mock


@pytest.fixture(autouse=True)
def _patch_storage():
    """Patch get_storage_bucket so storage_service can be imported without real Firebase."""
    with patch("app.firebase.get_storage_bucket") as mock:
        mock.return_value = MagicMock()
        yield mock


@pytest.fixture
def app(_patch_firebase_init, _patch_firestore):
    """Flask application fixture."""
    from run import create_app
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Test client fixture."""
    return app.test_client()


# ---------------------------------------------------------------------------
# Mock data helpers
# ---------------------------------------------------------------------------

def make_auth_headers(token="valid-session-token-123"):
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Health endpoints
# ---------------------------------------------------------------------------

class TestHealth:
    """GET /health and GET /api/v1/health"""

    def test_root_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "healthy"
        assert data["service"] == "paypruf-backend"

    def test_api_health(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "healthy"

    def test_health_content_type(self, client):
        resp = client.get("/health")
        assert resp.content_type == "application/json"

    def test_not_found(self, client):
        resp = client.get("/nonexistent")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Auth decorator basics
# ---------------------------------------------------------------------------

class TestAuthDecorator:
    """Verify that @require_auth blocks requests without valid sessions."""

    @patch("app.firebase.auth.get_session_uid")
    def test_missing_header(self, mock_get_session, client):
        """No Authorization header → 401."""
        mock_get_session.return_value = "m_abc123"
        resp = client.get("/api/v1/payments")
        assert resp.status_code == 401
        data = resp.get_json()
        assert data is not None

    @patch("app.firebase.auth.get_session_uid")
    def test_invalid_format(self, mock_get_session, client):
        """Header without 'Bearer' → 401."""
        mock_get_session.return_value = "m_abc123"
        resp = client.get(
            "/api/v1/payments",
            headers={"Authorization": "NotBearer token123"},
        )
        assert resp.status_code == 401

    @patch("app.firebase.auth.get_session_uid")
    def test_invalid_token(self, mock_get_session, client):
        """Invalid/unknown token → 401."""
        mock_get_session.return_value = None
        resp = client.get(
            "/api/v1/payments",
            headers=make_auth_headers("bogus-token"),
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Auth routes — signup / login
# ---------------------------------------------------------------------------

class TestSignup:
    """POST /api/v1/auth/signup"""

    def test_missing_data(self, client):
        resp = client.post("/api/v1/auth/signup", content_type="application/json",
                           data=json.dumps({}))
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "No data provided"

    def test_short_password(self, client):
        resp = client.post("/api/v1/auth/signup", content_type="application/json",
                           data=json.dumps({"password": "ab"}))
        assert resp.status_code == 400
        assert "Password" in resp.get_json()["error"]

    def test_no_identifier(self, client):
        resp = client.post("/api/v1/auth/signup", content_type="application/json",
                           data=json.dumps({"password": "password123"}))
        assert resp.status_code == 400
        assert "email" in resp.get_json()["error"].lower()

    @patch("app.firebase.firestore.firestore_service.find_merchant_by_identifier")
    def test_duplicate_email(self, mock_find, client):
        mock_find.return_value = {"email": "existing@test.com"}
        resp = client.post("/api/v1/auth/signup", content_type="application/json",
                           data=json.dumps({
                               "email": "existing@test.com",
                               "password": "password123",
                               "business_name": "Test Biz"
                           }))
        assert resp.status_code == 409
        assert "already exists" in resp.get_json()["error"]

    @patch("app.firebase.firestore.firestore_service.find_merchant_by_identifier")
    @patch("app.firebase.firestore.firestore_service.create_merchant")
    def test_successful_signup(self, mock_create, mock_find, client):
        mock_find.return_value = None
        mock_create.return_value = "merchant-doc-id-123"
        resp = client.post("/api/v1/auth/signup", content_type="application/json",
                           data=json.dumps({
                               "email": "merchant@test.com",
                               "password": "securepass123",
                               "business_name": "My Store",
                               "bank_name": "Wema Bank",
                               "account_number": "0123456789",
                               "account_name": "My Store Ltd"
                           }))
        assert resp.status_code == 201
        data = resp.get_json()
        assert "token" in data
        assert data["email"] == "merchant@test.com"
        assert data["business_name"] == "My Store"

    @patch("app.firebase.firestore.firestore_service.find_merchant_by_identifier")
    @patch("app.firebase.firestore.firestore_service.create_merchant")
    def test_signup_with_phone(self, mock_create, mock_find, client):
        mock_find.return_value = None
        mock_create.return_value = "merchant-doc-id-456"
        resp = client.post("/api/v1/auth/signup", content_type="application/json",
                           data=json.dumps({
                               "phone": "+2348023456789",
                               "password": "securepass123",
                               "business_name": "Phone Store"
                           }))
        assert resp.status_code == 201
        data = resp.get_json()
        assert "token" in data
        assert data["phone"] == "+2348023456789"

    @patch("app.firebase.firestore.firestore_service.find_merchant_by_identifier")
    @patch("app.firebase.firestore.firestore_service.create_merchant")
    def test_signup_with_wema_account(self, mock_create, mock_find, client):
        mock_find.return_value = None
        mock_create.return_value = "merchant-doc-id-789"
        resp = client.post("/api/v1/auth/signup", content_type="application/json",
                           data=json.dumps({
                               "wema_account": "WA100234",
                               "password": "securepass123",
                               "business_name": "Wema Store"
                           }))
        assert resp.status_code == 201
        data = resp.get_json()
        assert "token" in data
        assert data["wema_account"] == "WA100234"


class TestLogin:
    """POST /api/v1/auth/login"""

    def test_missing_data(self, client):
        resp = client.post("/api/v1/auth/login", content_type="application/json",
                           data=json.dumps({}))
        assert resp.status_code == 400
        assert "No data" in resp.get_json()["error"]

    def test_missing_identifier(self, client):
        resp = client.post("/api/v1/auth/login", content_type="application/json",
                           data=json.dumps({"password": "abc123"}))
        assert resp.status_code == 400
        assert "Provide" in resp.get_json()["error"]

    @patch("app.firebase.firestore.firestore_service.find_merchant_by_identifier")
    def test_invalid_credentials(self, mock_find, client):
        mock_find.return_value = None
        resp = client.post("/api/v1/auth/login", content_type="application/json",
                           data=json.dumps({"email": "nobody@test.com", "password": "wrong"}))
        assert resp.status_code == 401

    @patch("app.firebase.firestore.firestore_service.find_merchant_by_identifier")
    def test_successful_login(self, mock_find, client):
        """Login with email/password that matches a stored hash."""
        from app.firebase.auth import _hash_password
        hashed = _hash_password("mypassword")
        mock_find.return_value = {
            "uid": "m_abc123",
            "password_hash": hashed,
            "business_name": "My Store",
            "email": "merchant@test.com",
            "phone": "",
            "id": "merchant-doc-id",
        }
        resp = client.post("/api/v1/auth/login", content_type="application/json",
                           data=json.dumps({"email": "merchant@test.com", "password": "mypassword"}))
        assert resp.status_code == 200
        data = resp.get_json()
        assert "token" in data
        assert data["uid"] == "m_abc123"
        assert data["business_name"] == "My Store"


class TestLogout:
    """POST /api/v1/auth/logout"""

    @patch("app.firebase.auth.get_session_uid")
    def test_logout_without_auth(self, mock_get_session, client):
        mock_get_session.return_value = None
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code == 401

    @patch("app.firebase.firestore.firestore_service.delete_session")
    @patch("app.firebase.firestore.firestore_service.get_merchant_by_uid")
    @patch("app.firebase.auth.get_session_uid")
    def test_logout_success(self, mock_get_session, mock_get_merchant, mock_delete, client):
        mock_get_session.return_value = "m_abc123"
        mock_get_merchant.return_value = {"uid": "m_abc123", "business_name": "Test"}
        resp = client.post("/api/v1/auth/logout", headers=make_auth_headers())
        assert resp.status_code == 200

    def test_logout_without_token(self, client):
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code == 401
        data = resp.get_json()
        assert "Authorization header" in data.get("error", "")


# ---------------------------------------------------------------------------
# Auth /me endpoint
# ---------------------------------------------------------------------------

class TestMe:
    """GET /api/v1/auth/me"""

    @patch("app.firebase.auth.get_session_uid")
    @patch("app.firebase.firestore.firestore_service.get_merchant_by_uid")
    def test_me_authenticated(self, mock_get_merchant, mock_get_session, client):
        mock_get_session.return_value = "m_abc123"
        mock_get_merchant.return_value = {
            "uid": "m_abc123",
            "business_name": "My Store",
            "email": "merchant@test.com",
        }
        resp = client.get("/api/v1/auth/me", headers=make_auth_headers())
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["uid"] == "m_abc123"
        assert data["business_name"] == "My Store"

    def test_me_unauthenticated(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

class TestCORS:
    def test_cors_header_present(self, client):
        resp = client.get("/health")
        assert resp.headers.get("Access-Control-Allow-Origin") == "*"

    def test_cors_preflight(self, client):
        resp = client.options("/health")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

class TestAppFactory:
    def test_create_app(self, _patch_firebase_init, _patch_firestore):
        from run import create_app
        app = create_app()
        assert app is not None
        assert app.testing is False  # default — TESTING is set only in tests

    def test_app_testing_mode(self, app):
        assert app.testing is True