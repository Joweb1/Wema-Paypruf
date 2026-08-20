"""OCR layer for receipt images."""

from __future__ import annotations

from io import BytesIO
from typing import Any

from PIL import Image

from receipts.config import load_settings
from receipts.exceptions import ExtractionError


def _get_client(settings):
    """Return a configured Gemini client."""
    from google import genai
    from google.genai import types

    return genai.Client(
        api_key=settings.google_api_key,
        http_options=types.HttpOptions(
            timeout=settings.timeout_seconds * 1000,
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )


def _extract_text_from_response(response: Any) -> str:
    """Best-effort extraction of text from a provider response."""
    if response is None:
        raise ExtractionError("OCR provider returned no response.", code="OCR_INVALID_RESPONSE")

    text = getattr(response, "text", None)
    if text is not None:
        return str(text)

    if isinstance(response, dict):
        text = response.get("text")
        if text is not None:
            return str(text)

    candidates = getattr(response, "candidates", None)
    if candidates:
        first = candidates[0]
        if hasattr(first, "content"):
            parts = getattr(first.content, "parts", None) or []
            if parts:
                first_part = parts[0]
                if hasattr(first_part, "text"):
                    return str(first_part.text)

    raise ExtractionError("OCR provider returned an invalid response.", code="OCR_INVALID_RESPONSE")


def extract_text(image_bytes: bytes, *, filename: str | None = None, model: str | None = None) -> str:
    """Send a processed receipt image to Gemini and return raw OCR text."""
    if not image_bytes:
        raise ExtractionError("No image data received for OCR.", code="OCR_EMPTY_IMAGE")

    settings = load_settings()
    if not settings.google_api_key:
        raise ExtractionError("Google API key is not configured.", code="OCR_API_KEY_MISSING")

    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
        image_format = (image.format or "PNG").upper()
        mime_type = Image.MIME.get(image_format, "image/png")

        print({
            "model": model or settings.model,
            "image_bytes": len(image_bytes),
            "image_dimensions": image.size,
            "image_format": image_format,
            "mime_type": mime_type,
            "timeout_ms": settings.timeout_seconds * 1000,
            "retry_count": 1,
        })
    except Exception as exc:
        raise ExtractionError(
            "The processed receipt image could not be decoded for OCR.",
            code="OCR_INVALID_IMAGE",
        ) from exc

    try:
        from google.genai import types

        client = _get_client(settings)
        response = client.models.generate_content(
            model=model or settings.model,
            contents=[
                "Extract all visible text from this receipt image. "
                "Return only the raw receipt text, preserving the original line breaks and wording. "
                "If no text can be read, return an empty string.",
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
            config=types.GenerateContentConfig(
                temperature=settings.temperature,
            ),
        )
    except TimeoutError as exc:
        raise ExtractionError("OCR request timed out.", code="OCR_TIMEOUT") from exc
    except Exception as exc:
        message = str(exc).lower()
        print(f"\nGEMINI OCR ERROR: {type(exc).__name__}: {exc}\n")

        if "timeout" in message:
            raise ExtractionError("OCR request timed out.", code="OCR_TIMEOUT") from exc

        raise ExtractionError(
            f"OCR provider request failed: {exc}",
            code="OCR_PROVIDER_ERROR",
        ) from exc

    try:
        text = _extract_text_from_response(response)
    except ExtractionError:
        raise
    except Exception as exc:
        raise ExtractionError(
            "OCR provider returned an invalid response.",
            code="OCR_INVALID_RESPONSE",
        ) from exc

    cleaned = text.strip()
    if cleaned == "":
        raise ExtractionError("OCR produced an empty text response.", code="OCR_EMPTY_RESPONSE")
    print("===== RAW OCR TEXT =====")
    print(cleaned)
    print("===== END RAW OCR TEXT =====")
    return cleaned