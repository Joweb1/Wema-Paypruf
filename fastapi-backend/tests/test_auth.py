"""Unit and Integration tests for Authentication and Onboarding endpoints."""

from __future__ import annotations


def test_root_and_health(client):
    """Test health check endpoints."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}

    res2 = client.get("/")
    assert res2.status_code == 200
    assert res2.json()["app"] == "PayPruf API"


def test_session_unauthenticated(client):
    """Unauthenticated session returns null user."""
    res = client.get("/api/v1/auth/session")
    assert res.status_code == 200
    assert res.json() == {"user": None}


def test_demo_login(client):
    """Demo login returns user profile and valid token."""
    res = client.post("/api/v1/auth/demo-login")
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["fullName"] == "Tola Adeyemi"
    assert data["user"]["wemaAccountNumber"] == "0123456789"
    assert data["user"]["merchantOnboardingCompleted"] is True


def test_login_multi_identifiers(client):
    """Test login with email, phone, and Wema account number."""
    # 1. Login with Wema account number
    res1 = client.post(
        "/api/v1/auth/login",
        json={"identifier": "0123456789", "password": "demopassword123"}
    )
    assert res1.status_code == 200
    assert res1.json()["user"]["id"] == "usr_wema_demo_01"

    # 2. Login with email
    res2 = client.post(
        "/api/v1/auth/login",
        json={"identifier": "tolafashion@example.com", "password": "demopassword123"}
    )
    assert res2.status_code == 200
    assert res2.json()["user"]["id"] == "usr_wema_demo_01"

    # 3. Login with phone number
    res3 = client.post(
        "/api/v1/auth/login",
        json={"identifier": "08012345678", "password": "demopassword123"}
    )
    assert res3.status_code == 200
    assert res3.json()["user"]["id"] == "usr_wema_demo_01"


def test_login_invalid_credentials(client):
    """Invalid password returns 401 error."""
    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "0123456789", "password": "wrongpassword"}
    )
    assert res.status_code == 401
    assert "Invalid login credentials" in res.json()["detail"]


def test_register_merchant(client):
    """Register new merchant and verify session."""
    unique_email = f"test_merchant_{client.__hash__() or '99'}@example.com"
    payload = {
        "fullName": "Zara Organics",
        "method": "email",
        "identifier": unique_email,
        "password": "securepassword123",
        "confirmPassword": "securepassword123",
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["fullName"] == "Zara Organics"
    assert "token" in data

    token = data["token"]
    # Check session with this token
    session_res = client.get(
        "/api/v1/auth/session",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert session_res.status_code == 200
    assert session_res.json()["user"]["fullName"] == "Zara Organics"


def test_merchant_profile_and_onboarding(client, auth_headers):
    """Retrieve merchant profile and update onboarding settlement account."""
    # 1. Get profile
    res = client.get("/api/v1/merchant/profile", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["profile"]["businessName"] == "Tola Fashion"

    # 2. Complete onboarding
    onboard_payload = {
        "wemaAccountNumber": "0123456789",
        "accountName": "Tola Fashion Enterprise",
        "businessName": "Tola Fashion Couture",
    }
    onboard_res = client.post(
        "/api/v1/merchant/onboarding",
        headers=auth_headers,
        json=onboard_payload
    )
    assert onboard_res.status_code == 200
    assert onboard_res.json()["user"]["businessName"] == "Tola Fashion Couture"
