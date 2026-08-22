"""Pydantic schemas for Receipt OCR extraction."""

from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel


class ReceiptResponse(BaseModel):
    """Receipt record returned to frontend."""
    original_filename: str
    mime_type: str
    size_bytes: int
    preview_url: Optional[str] = None
    amount: Optional[str] = None
    currency: str = "NGN"
    reference: Optional[str] = None
    bank: Optional[str] = None
    status_text: Optional[str] = None
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    account_hint: Optional[str] = None
    transaction_date: Optional[str] = None
    confidence: float = 0.95
    raw_text: Optional[str] = None


class ExtractedReceiptClaim(BaseModel):
    """Internal normalized receipt claim produced by OCR engine."""
    amount: Optional[str] = None
    currency: Optional[str] = "NGN"
    transaction_reference: Optional[str] = None
    transaction_date: Optional[str] = None
    transaction_time: Optional[str] = None
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    sender_account: Optional[str] = None
    recipient_account: Optional[str] = None
    bank_name: Optional[str] = None
    transaction_type: Optional[str] = None
    narration: Optional[str] = None
    status_text: Optional[str] = None
    confidence: float = 0.95
    raw_text: str = ""
    warnings: List[str] = []
