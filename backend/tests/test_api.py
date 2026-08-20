from __future__ import annotations

from backend.tests.conftest import ApiEnvironment, png_bytes


def test_health_reports_database_and_mock_providers(api: ApiEnvironment) -> None:
    response = api.client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "ok",
        "wema_provider": "mock",
        "ocr_provider": "rapidocr",
    }


def test_create_get_and_list_payment(api: ApiEnvironment) -> None:
    created = api.create_payment(customer_name="  Ada Nwosu  ")

    assert created["customer_name"] == "Ada Nwosu"
    assert created["amount"] == "25000.00"
    assert created["reference"].startswith("PRUF-")
    assert created["status"] == "PENDING"
    assert created["stage"] == "AWAITING_RECEIPT"

    detail = api.client.get(f"/api/payments/{created['id']}")
    assert detail.status_code == 200
    assert detail.json()["payment"]["id"] == created["id"]
    assert detail.json()["receipt"] is None

    listing = api.client.get("/api/payments", params={"search": "Ada", "status": "PENDING"})
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["id"] == created["id"]


def test_public_invalid_token_uses_standard_error(api: ApiEnvironment) -> None:
    response = api.client.get("/api/public/payments/not-a-real-token")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "PAYMENT_NOT_FOUND",
            "message": "The requested payment could not be found.",
            "details": None,
        }
    }


def test_public_payment_omits_private_token_and_phone(api: ApiEnvironment) -> None:
    payment = api.create_payment()

    response = api.client.get(f"/api/public/payments/{payment['public_token']}")

    assert response.status_code == 200
    public_payment = response.json()["payment"]
    assert "public_token" not in public_payment
    assert "customer_phone" not in public_payment
    assert response.json()["payment_instructions"]["environment"] == (
        "Wema Sandbox / Demo Environment"
    )


def test_valid_upload_returns_extracted_receipt(api: ApiEnvironment) -> None:
    payment = api.create_payment()

    response = api.upload(payment["id"])

    assert response.status_code == 201
    body = response.json()
    assert body["payment"]["stage"] == "READY_TO_VERIFY"
    assert body["receipt"]["amount"] == "25000.00"
    assert body["receipt"]["reference"] == "PAYPRUF-DEMO-001"
    assert body["receipt"]["raw_text"] == "Synthetic receipt test evidence"


def test_upload_rejects_invalid_extension_and_mime(api: ApiEnvironment) -> None:
    payment = api.create_payment()

    response = api.client.post(
        f"/api/payments/{payment['id']}/receipt",
        files={"file": ("receipt.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "INVALID_RECEIPT_TYPE"


def test_upload_rejects_content_that_does_not_match_declared_type(api: ApiEnvironment) -> None:
    payment = api.create_payment()

    response = api.client.post(
        f"/api/payments/{payment['id']}/receipt",
        files={"file": ("receipt.jpg", png_bytes(), "image/jpeg")},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "INVALID_RECEIPT_TYPE"


def test_verify_requires_receipt(api: ApiEnvironment) -> None:
    payment = api.create_payment()

    response = api.client.post(f"/api/payments/{payment['id']}/verify")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "RECEIPT_REQUIRED"


def test_validation_errors_have_structured_envelope(api: ApiEnvironment) -> None:
    response = api.client.post(
        "/api/payments",
        json={"customer_name": " ", "amount": "0", "description": "", "unexpected": True},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"] == "The request contains invalid data."
    assert isinstance(body["error"]["details"], list)
    assert {item["field"] for item in body["error"]["details"]} >= {
        "body.amount",
        "body.customer_name",
        "body.description",
        "body.unexpected",
    }
