"""Stage 1 of the pipeline — Image Validation.

Decide early (and cheaply, before any API call) whether the uploaded bytes
are a receipt-looking image we can process. Raises ImageValidationError on
any hard failure; on success returns a ValidatedImage carrying the decoded
PIL image so downstream stages don't re-open the bytes.

Checks:
  - non-empty
  - size under RECEIPT_MAX_FILE_MB   (prevents huge uploads wasting time/cost)
  - decodable by Pillow              (rejects corrupt / non-images)
  - format in allowed set            (JPG/PNG/WEBP/BMP/GIF/TIFF)
  - dimensions under hard cap        (worst-case-decode memory safety)
"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Optional

from PIL import Image, UnidentifiedImageError

from .exceptions import ImageValidationError

# Formats Pillow can decode that we will accept. JPG/PNG are the demo cases;
# WEBP/BMP/GIF/TIFF are tolerated so the demo isn't brittle to format.
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "BMP", "GIF", "TIFF"}

_FORMAT_TO_CONTENT_TYPE = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "BMP": "image/bmp",
    "GIF": "image/gif",
    "TIFF": "image/tiff",
}


@dataclass
class ValidatedImage:
    """Result of successful image validation."""

    pil: Image.Image
    format: str          # e.g. "PNG"
    width: int
    height: int
    content_type: str
    source_filename: Optional[str]


def _content_type(fmt: str) -> str:
    return _FORMAT_TO_CONTENT_TYPE.get(fmt, "application/octet-stream")


def validate_image(
    image_bytes: bytes,
    *,
    filename: Optional[str] = None,
    max_file_mb: int,
    max_dimension: int,
    hard_dimension_cap: int,
) -> ValidatedImage:
    """Validate uploaded image bytes. Raises ImageValidationError on failure."""
    if not image_bytes:
        raise ImageValidationError("No image data received.")

    size_mb = len(image_bytes) / (1024 * 1024)
    if size_mb > max_file_mb:
        raise ImageValidationError(
            f"Image is too large ({size_mb:.1f} MB). The maximum is {max_file_mb} MB.",
            code="IMAGE_TOO_LARGE",
        )

    # Decode — UnidentifiedImageError / OSError covers "not an image" and "truncated".
    try:
        pil = Image.open(BytesIO(image_bytes))
        pil.load()  # force full decode so truncated images surface here
    except (UnidentifiedImageError, OSError) as err:
        raise ImageValidationError(
            "The file could not be read as an image. It may be corrupted or not an image.",
            code="IMAGE_UNREADABLE",
        ) from err

    fmt = (pil.format or "").upper()
    if fmt not in ALLOWED_FORMATS:
        raise ImageValidationError(
            f"Unsupported image format '{fmt or 'unknown'}'. Please upload a JPG or PNG image.",
            code="IMAGE_UNSUPPORTED_FORMAT",
        )

    width, height = pil.size
    if max(width, height) > hard_dimension_cap:
        raise ImageValidationError(
            f"Image is too large ({width}x{height} px). The maximum is "
            f"{hard_dimension_cap} px on the longest side.",
            code="IMAGE_DIMENSIONS_TOO_LARGE",
        )

    return ValidatedImage(
        pil=pil,
        format=fmt,
        width=width,
        height=height,
        content_type=_content_type(fmt),
        source_filename=filename,
    )
