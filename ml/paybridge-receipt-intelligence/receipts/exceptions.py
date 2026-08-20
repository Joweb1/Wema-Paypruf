"""Exceptions for the Receipt Intelligence pipeline.

All derive from ReceiptError so the orchestrator can catch any pipeline
failure in one place and return a structured {success:false, error:...}
to the frontend instead of crashing.
"""

from __future__ import annotations


class ReceiptError(Exception):
    """Base class for all Receipt Intelligence pipeline errors."""


class ImageValidationError(ReceiptError):
    """The uploaded image is missing/too-large/corrupt/unreadable."""

    def __init__(self, message: str, *, code: str = "INVALID_IMAGE"):
        super().__init__(message)
        self.message = message
        self.code = code


class ExtractionError(ReceiptError):
    """The vision extractor failed to return usable structured fields."""

    def __init__(self, message: str, *, code: str = "EXTRACTION_FAILED"):
        super().__init__(message)
        self.message = message
        self.code = code
