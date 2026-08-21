"""Stage 2 of the pipeline — Image Preprocessing.

SENIOR DESIGN NOTE — keep this minimal for the vision-LLM path.
The primary extractor is Gemini, a multimodal model that is robust to noise,
rotation, low contrast and cropping. Classic OCR aids (grayscale, adaptive
thresholding, CLAHE, unsharp mask) can *hurt* a clean screenshot, so they are
NOT applied by default. We only do the safe, always-helpful ops:

  1. Convert to RGB (predictable channels, handles RGBA/P/L/CMYK).
  2. Apply EXIF orientation (phone photos are often rotated in metadata).
  3. Downscale if the longest side exceeds RECEIPT_MAX_DIMENSION (caps
     payload size and API latency; keeps aspect ratio).

Output is in-memory PNG bytes (lossless) ready for the extractor.

Heavy ops remain available via `apply_ocr_enhancements` for the optional
Tesseract fallback path, where they genuinely help.
"""

from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageOps

from .validation import ValidatedImage


def prepare(validated: ValidatedImage, *, max_dimension: int) -> bytes:
    """Return processed, in-memory PNG bytes for the extractor.

    Minimal/safe path only (see module docstring). Never raises on bad pixels.
    """
    img = validated.pil

    # 1. Normalize to RGB. (Grayscale L -> RGB is lossless; alpha/CMYK flatten.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 2. Honor EXIF orientation so a sideways phone photo is upright.
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:  # noqa: BLE001
        pass  # some formats lack EXIF; orientation stays as-is

    # 3. Downscale only if needed, preserving aspect ratio (LANCZOS = high quality).
    w, h = img.size
    longest = max(w, h)
    if longest > max_dimension:
        ratio = max_dimension / longest
        new_size = (max(1, round(w * ratio)), max(1, round(h * ratio)))
        img = img.resize(new_size, Image.LANCZOS)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def apply_ocr_enhancements(pil: Image.Image) -> Image.Image:
    """Aggressive pipeline for the OPTIONAL classic-OCR (Tesseract) fallback.

    Grayscale + autocontrast + mild sharpen. NOT used for the Gemini path.
    Kept here so the fallback (Phase 4, behind a flag) can opt in.
    """
    img = pil.convert("L")
    img = ImageOps.autocontrast(img)
    try:
        from PIL import ImageFilter

        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=130, threshold=3))
    except Exception:  # noqa: BLE001
        pass
    return img
