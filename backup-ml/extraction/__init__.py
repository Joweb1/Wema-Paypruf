"""Public interface for receipt extraction.

This package extracts supporting evidence from a receipt. It deliberately has
no payment matching or payment-status logic.
"""

from .errors import ReceiptExtractionError
from .models import ExtractedReceipt
from .service import ReceiptExtractionService

__all__ = ["ExtractedReceipt", "ReceiptExtractionError", "ReceiptExtractionService"]
