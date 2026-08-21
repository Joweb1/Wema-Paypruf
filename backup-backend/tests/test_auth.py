from __future__ import annotations

from backend.tests.conftest import ApiEnvironment


def test_register_email_creates_user_and_sets_cookie(api: ApiEnvironment) -> None:
    response = api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Emmanuel Abisola",
            "method": "email",
            "identifier": "Emmanuel@example.com",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "emmanuel@example.com"
    assert body["fullName"] == "Emmanuel Abisola"
    assert body["merchantOnboardingCompleted"] is False
    assert "paypruf_session" in response.cookies


def test_register_phone_normalizes_and_prevents_duplicates(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Phone User",
            "method": "phone",
            "identifier": "08012345678",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    response = api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Phone User 2",
            "method": "phone",
            "identifier": "+2348012345678",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_IDENTIFIER"


def test_register_wema_success(api: ApiEnvironment) -> None:
    response = api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Wema User",
            "method": "wema",
            "identifier": "0123456789",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    assert response.status_code == 201
    assert response.json()["wemaAccountNumber"] == "0123456789"


def test_register_duplicate_wema_account(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Wema User",
            "method": "wema",
            "identifier": "0123456789",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    response = api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Wema User 2",
            "method": "wema",
            "identifier": "0123456789",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_IDENTIFIER"


def test_register_validation_errors(api: ApiEnvironment) -> None:
    response = api.client.post(
        "/api/auth/register",
        json={
            "fullName": "",
            "method": "email",
            "identifier": "not-an-email",
            "password": "short",
            "confirmPassword": "nope",
        },
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    details = {item["field"]: item["message"] for item in body["error"]["details"]}
    assert "fullName" in details
    assert "email" in details or "identifier" in details
    assert "password" in details


def test_login_email_success(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Emmanuel Abisola",
            "method": "email",
            "identifier": "Emmanuel@example.com",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    response = api.client.post(
        "/api/auth/login",
        json={"identifier": "emmanuel@example.com", "password": "Password1"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "emmanuel@example.com"


def test_login_phone_normalized(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Phone User",
            "method": "phone",
            "identifier": "+2348012345678",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    response = api.client.post(
        "/api/auth/login",
        json={"identifier": "08012345678", "password": "Password1"},
    )
    assert response.status_code == 200
    assert response.json()["phone"] == "+2348012345678"


def test_login_wrong_password(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Emmanuel Abisola",
            "method": "email",
            "identifier": "Emmanuel@example.com",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    response = api.client.post(
        "/api/auth/login",
        json={"identifier": "emmanuel@example.com", "password": "Wrongpass1"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_unknown_identifier(api: ApiEnvironment) -> None:
    response = api.client.post(
        "/api/auth/login",
        json={"identifier": "no-such@example.com", "password": "Password1"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_requires_auth(api: ApiEnvironment) -> None:
    response = api.client.get("/api/auth/me")
    assert response.status_code == 401


def test_logout_clears_session(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Emmanuel Abisola",
            "method": "email",
            "identifier": "Emmanuel@example.com",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    assert api.client.get("/api/auth/me").status_code == 200
    response = api.client.post("/api/auth/logout")
    assert response.status_code == 200
    assert api.client.get("/api/auth/me").status_code == 401


def test_onboarding_creates_profile(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Emmanuel Abisola",
            "method": "email",
            "identifier": "Emmanuel@example.com",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    response = api.client.post(
        "/api/merchant/onboarding",
        json={"wemaAccountNumber": "0123456789", "accountName": "Emmanuel Abisola"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["merchantOnboardingCompleted"] is True
    assert body["profile"]["onboardingCompleted"] is True
    assert body["profile"]["accountName"] == "Emmanuel Abisola"
    assert body["profile"]["wemaAccountNumber"] == "0123456789"


def test_onboarding_wema_user_prefills(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Wema User",
            "method": "wema",
            "identifier": "0123456789",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    response = api.client.post(
        "/api/merchant/onboarding",
        json={"wemaAccountNumber": "0123456789", "accountName": "Wema User Account"},
    )
    assert response.status_code == 200
    assert response.json()["profile"]["wemaAccountNumber"] == "0123456789"


def test_onboarding_validation_rejects_bad_account(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Emmanuel Abisola",
            "method": "email",
            "identifier": "Emmanuel@example.com",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    response = api.client.post(
        "/api/merchant/onboarding",
        json={"wemaAccountNumber": "123", "accountName": "Emmanuel Abisola"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_dashboard_summary_requires_auth(api: ApiEnvironment) -> None:
    response = api.client.get("/api/dashboard/summary")
    assert response.status_code == 401


def test_dashboard_summary_returns_authenticated_merchant(api: ApiEnvironment) -> None:
    api.client.post(
        "/api/auth/register",
        json={
            "fullName": "Emmanuel Abisola",
            "method": "email",
            "identifier": "Emmanuel@example.com",
            "password": "Password1",
            "confirmPassword": "Password1",
        },
    )
    api.client.post(
        "/api/merchant/onboarding",
        json={"wemaAccountNumber": "0123456789", "accountName": "Emmanuel Abisola"},
    )
    response = api.client.get("/api/dashboard/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["merchant"]["display_name"] == "Emmanuel Abisola"
    assert body["merchant"]["wema_account_name"] == "Emmanuel Abisola"
    assert body["merchant"]["wema_account_number_hint"] == "ending 6789"


def test_rate_limit_does_not_block_normal_use(api: ApiEnvironment) -> None:
    for _ in range(5):
        response = api.client.post(
            "/api/auth/login",
            json={"identifier": "nope@example.com", "password": "wrong"},
        )
        assert response.status_code == 401
