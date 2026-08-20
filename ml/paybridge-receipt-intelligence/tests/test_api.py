from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


SUCCESS_RESULT = {
    "success": True,
    "fields": {"amount": 50000.0, "currency": "NGN"},
    "validation": {"valid": True, "field_results": {}, "errors": []},
    "confidence": {"fields": {}, "overall_confidence": 0.95},
    "warnings": [],
}


def test_successful_receipt_analysis(monkeypatch):
    monkeypatch.setattr("api.main.process_receipt", lambda data, **kwargs: SUCCESS_RESULT)

    response = client.post(
        "/receipts/analyze",
        files={"image": ("receipt.png", b"image-bytes", "image/png")},
    )

    assert response.status_code == 200
    assert response.json() == SUCCESS_RESULT


def test_missing_image_is_rejected():
    response = client.post("/receipts/analyze")

    assert response.status_code == 422


def test_empty_image_returns_validation_failure(monkeypatch):
    monkeypatch.setattr(
        "api.main.process_receipt",
        lambda data, **kwargs: {
            "success": False,
            "error": "No image data received.",
            "code": "INVALID_IMAGE",
        },
    )

    response = client.post(
        "/receipts/analyze",
        files={"image": ("empty.png", b"", "image/png")},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_IMAGE"


def test_pipeline_validation_failure_is_returned_cleanly(monkeypatch):
    monkeypatch.setattr(
        "api.main.process_receipt",
        lambda data, **kwargs: {
            "success": False,
            "error": "Image dimensions are too large.",
            "code": "IMAGE_DIMENSIONS_TOO_LARGE",
        },
    )

    response = client.post(
        "/receipts/analyze",
        files={"image": ("receipt.png", b"image-bytes", "image/png")},
    )

    assert response.status_code == 400
    assert response.json()["success"] is False


def test_pipeline_ocr_failure_is_returned_cleanly(monkeypatch):
    monkeypatch.setattr(
        "api.main.process_receipt",
        lambda data, **kwargs: {
            "success": False,
            "error": "OCR provider request failed.",
            "code": "OCR_PROVIDER_ERROR",
        },
    )

    response = client.post(
        "/receipts/analyze",
        files={"image": ("receipt.png", b"image-bytes", "image/png")},
    )

    assert response.status_code == 502
    assert response.json()["code"] == "OCR_PROVIDER_ERROR"


def test_response_structure_is_preserved(monkeypatch):
    monkeypatch.setattr("api.main.process_receipt", lambda data, **kwargs: SUCCESS_RESULT)

    response = client.post(
        "/receipts/analyze",
        files={"image": ("receipt.png", b"image-bytes", "image/png")},
    )
    body = response.json()

    assert set(body) == {"success", "fields", "validation", "confidence", "warnings"}
    assert set(body["confidence"]) == {"fields", "overall_confidence"}