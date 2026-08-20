"""Tests for Stage 1 — Image Validation.

Synthesizes images with Pillow (no real receipt files needed) and asserts the
accept/reject decisions and codes. Uses small explicit thresholds so we don't
have to build multi-megabyte fixtures.
"""

from __future__ import annotations

from io import BytesIO

import pytest
from PIL import Image

from receipts.exceptions import ImageValidationError
from receipts.validation import validate_image


# ---- helpers ---------------------------------------------------------------


def _png(w: int = 100, h: int = 100, mode: str = "RGB") -> bytes:
    buf = BytesIO()
    Image.new(mode, (w, h), (255, 255, 255) if mode != "L" else 0).save(buf, format="PNG")
    return buf.getvalue()


def _jpeg(w: int = 100, h: int = 100) -> bytes:
    buf = BytesIO()
    Image.new("RGB", (w, h), (255, 255, 255)).save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def _ico() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (32, 32), (0, 0, 0)).save(buf, format="ICO")
    return buf.getvalue()


def _kwargs(**overrides):
    base = dict(max_file_mb=2, max_dimension=3000, hard_dimension_cap=12000)
    base.update(overrides)
    return base


# ---- accept cases ----------------------------------------------------------


def test_accepts_png():
    res = validate_image(_png(), filename="r.png", **_kwargs())
    assert res.format == "PNG"
    assert res.content_type == "image/png"
    assert (res.width, res.height) == (100, 100)
    assert res.source_filename == "r.png"
    assert res.pil is not None


def test_accepts_jpeg():
    res = validate_image(_jpeg(), filename=None, **_kwargs())
    assert res.format == "JPEG"
    assert res.content_type == "image/jpeg"


# ---- reject cases ----------------------------------------------------------


def test_rejects_empty_bytes():
    with pytest.raises(ImageValidationError) as ei:
        validate_image(b"", **_kwargs())
    assert ei.value.code == "INVALID_IMAGE"


def test_rejects_too_large():
    # 3 MB of junk but allowed image size limit is 2 MB -> rejected on size.
    big = b"\x00" * (3 * 1024 * 1024)
    with pytest.raises(ImageValidationError) as ei:
        validate_image(big, **_kwargs(max_file_mb=2))
    assert ei.value.code == "IMAGE_TOO_LARGE"


def test_rejects_corrupt_non_image():
    with pytest.raises(ImageValidationError) as ei:
        validate_image(b"this is definitely not an image", **_kwargs())
    assert ei.value.code == "IMAGE_UNREADABLE"


def test_rejects_unsupported_format():
    # ICO is decodable by Pillow but not in our allowed set.
    with pytest.raises(ImageValidationError) as ei:
        validate_image(_ico(), **_kwargs())
    assert ei.value.code == "IMAGE_UNSUPPORTED_FORMAT"
    assert "JPG or PNG" in ei.value.message


def test_rejects_dimensions_above_hard_cap():
    # Valid PNG that exceeds the hard dimension cap (cap set low for the test).
    huge = _png(200, 200)
    with pytest.raises(ImageValidationError) as ei:
        validate_image(huge, **_kwargs(hard_dimension_cap=120))
    assert ei.value.code == "IMAGE_DIMENSIONS_TOO_LARGE"
