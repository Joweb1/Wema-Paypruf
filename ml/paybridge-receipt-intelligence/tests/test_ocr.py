"""Tests for the OCR layer.

These tests mock the external Gemini API so no real network call is made.
"""

from __future__ import annotations

from io import BytesIO

from PIL import Image

from receipts.exceptions import ExtractionError
from receipts.extractors import extract_text


class _DummyResponse:
    def __init__(self, text: str | None):
        self.text = text


class _DummyClient:
    def __init__(self, *, response=None, exc=None):
        self._response = response
        self._exc = exc
        self.calls = []

    def __getattr__(self, name: str):
        if name == "models":
            return self
        raise AttributeError(name)

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self._exc is not None:
            raise self._exc
        return self._response


def _image_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (40, 40), (255, 255, 255)).save(buf, format="PNG")
    return buf.getvalue()


def test_extract_text_success(monkeypatch):
    monkeypatch.setattr(
        "receipts.extractors.ocr.load_settings",
        lambda: type(
            "Settings",
            (),
            {
                "google_api_key": "test-key",
                "model": "gemini-2.0-flash",
                "temperature": 0.0,
                "timeout_seconds": 30,
                "max_retries": 2,
            },
        )(),
    )
    monkeypatch.setattr(
        "receipts.extractors.ocr._get_client",
        lambda api_key: _DummyClient(response=_DummyResponse("WEMA TRANSFER\nAMOUNT 50000")),
    )

    result = extract_text(_image_bytes())

    assert result == "WEMA TRANSFER\nAMOUNT 50000"


def test_extract_text_empty_response(monkeypatch):
    monkeypatch.setattr(
        "receipts.extractors.ocr.load_settings",
        lambda: type(
            "Settings",
            (),
            {
                "google_api_key": "test-key",
                "model": "gemini-2.0-flash",
                "temperature": 0.0,
                "timeout_seconds": 30,
                "max_retries": 2,
            },
        )(),
    )
    monkeypatch.setattr(
        "receipts.extractors.ocr._get_client",
        lambda api_key: _DummyClient(response=_DummyResponse("   ")),
    )

    try:
        extract_text(_image_bytes())
        assert False, "Expected ExtractionError for empty OCR response"
    except ExtractionError as exc:
        assert exc.code == "OCR_EMPTY_RESPONSE"


def test_extract_text_provider_error(monkeypatch):
    monkeypatch.setattr(
        "receipts.extractors.ocr.load_settings",
        lambda: type(
            "Settings",
            (),
            {
                "google_api_key": "test-key",
                "model": "gemini-2.0-flash",
                "temperature": 0.0,
                "timeout_seconds": 30,
                "max_retries": 2,
            },
        )(),
    )
    monkeypatch.setattr(
        "receipts.extractors.ocr._get_client",
        lambda api_key: _DummyClient(exc=RuntimeError("provider blew up")),
    )

    try:
        extract_text(_image_bytes())
        assert False, "Expected ExtractionError for provider failure"
    except ExtractionError as exc:
        assert exc.code == "OCR_PROVIDER_ERROR"


def test_extract_text_timeout(monkeypatch):
    monkeypatch.setattr(
        "receipts.extractors.ocr.load_settings",
        lambda: type(
            "Settings",
            (),
            {
                "google_api_key": "test-key",
                "model": "gemini-2.0-flash",
                "temperature": 0.0,
                "timeout_seconds": 5,
                "max_retries": 1,
            },
        )(),
    )
    monkeypatch.setattr(
        "receipts.extractors.ocr._get_client",
        lambda api_key: _DummyClient(exc=TimeoutError("timed out")),
    )

    try:
        extract_text(_image_bytes())
        assert False, "Expected ExtractionError for timeout"
    except ExtractionError as exc:
        assert exc.code == "OCR_TIMEOUT"


def test_extract_text_malformed_response(monkeypatch):
    monkeypatch.setattr(
        "receipts.extractors.ocr.load_settings",
        lambda: type(
            "Settings",
            (),
            {
                "google_api_key": "test-key",
                "model": "gemini-2.0-flash",
                "temperature": 0.0,
                "timeout_seconds": 30,
                "max_retries": 2,
            },
        )(),
    )
    monkeypatch.setattr(
        "receipts.extractors.ocr._get_client",
        lambda api_key: _DummyClient(response=object()),
    )

    try:
        extract_text(_image_bytes())
        assert False, "Expected ExtractionError for malformed provider response"
    except ExtractionError as exc:
        assert exc.code == "OCR_INVALID_RESPONSE"