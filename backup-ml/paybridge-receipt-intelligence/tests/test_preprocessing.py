"""Tests for Stage 2 — Image Preprocessing (minimal/safe path)."""

from __future__ import annotations

from io import BytesIO

from PIL import Image

from receipts.preprocessing import prepare
from receipts.validation import validate_image


def _validated(w: int, h: int, mode: str = "RGB") -> object:
    buf = BytesIO()
    Image.new(mode, (w, h), (255, 255, 255) if mode != "L" else 0).save(buf, format="PNG")
    return validate_image(
        buf.getvalue(),
        max_file_mb=2,
        max_dimension=3000,
        hard_dimension_cap=12000,
    )


def _decode(out: bytes) -> Image.Image:
    return Image.open(BytesIO(out))


def test_downscales_oversized_image():
    res = prepare(_validated(1000, 800), max_dimension=300)
    img = _decode(res)
    assert max(img.size) <= 300
    # aspect ratio preserved (1000:800 = 5:4) -> longest side (width) = 300
    assert img.size == (300, 240)


def test_keeps_small_image_unchanged():
    res = prepare(_validated(200, 150), max_dimension=300)
    img = _decode(res)
    assert img.size == (200, 150)


def test_output_is_png():
    res = prepare(_validated(100, 100), max_dimension=300)
    img = _decode(res)
    assert img.format == "PNG"


def test_normalizes_rgba_to_rgb():
    res = prepare(_validated(50, 50, mode="RGBA"), max_dimension=300)
    img = _decode(res)
    assert img.mode == "RGB"


def test_normalizes_grayscale_to_rgb():
    res = prepare(_validated(50, 50, mode="L"), max_dimension=300)
    img = _decode(res)
    assert img.mode == "RGB"
