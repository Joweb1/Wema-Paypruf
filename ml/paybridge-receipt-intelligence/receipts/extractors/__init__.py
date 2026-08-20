"""Receipt extraction helpers.

This package intentionally starts with OCR only. Later phases can add richer
field extraction without changing the OCR interface.
"""

"""Receipt extraction helpers.

OCR turns a receipt image into raw text; field extraction turns that raw
text into structured payment-claim fields. Neither stage determines payment
validity — see receipts/pipeline.py for the full boundary.
"""

from .ocr import extract_text
from .fields import extract_fields


__all__ = ["extract_text", "extract_fields"]