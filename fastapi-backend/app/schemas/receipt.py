"""Pydantic schemas for Receipt OCR extraction and Gemini Vision Intelligence."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FieldEvidence(BaseModel):
    """Field-level confidence and exact evidence snippet extracted from receipt."""
    value: Optional[str] = None
    confidence: float = 0.95
    evidence: Optional[str] = None

    model_config = {"extra": "allow"}


class ReceiptAuthenticityIndicators(BaseModel):
    """Visual cues and layout structural assessment extracted from receipt."""
    has_bank_logo: bool = True
    has_stamp_or_watermark: bool = False
    standard_layout: bool = True
    suspicious_typography: bool = False
    tampering_detected: bool = False
    originality_score: float = 0.95
    authenticity_verdict: str = "GENUINE"  # GENUINE | SUSPICIOUS | LIKELY_ALTERED
    notes: Optional[str] = None

    model_config = {"extra": "allow"}


class GeminiExtractionSchema(BaseModel):
    """Strict structured JSON returned by Gemini Vision model."""
    bank_name: Optional[str] = None
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None
    amount: Optional[str] = None
    currency: Optional[str] = "NGN"
    transaction_id: Optional[str] = None
    transaction_date: Optional[str] = None
    transaction_time: Optional[str] = None
    description: Optional[str] = None
    account_number: Optional[str] = None
    sender_account: Optional[str] = None
    receipt_type: Optional[str] = "TRANSFER"
    receipt_authenticity_indicators: Optional[ReceiptAuthenticityIndicators] = None
    confidence: float = 0.95
    originality_score: float = 0.95
    tampering_detected: bool = False
    authenticity_verdict: str = "GENUINE"
    field_confidence: Optional[Dict[str, FieldEvidence]] = None
    missing_fields: List[str] = Field(default_factory=list)
    raw_text: str = ""
    ai_engine: str = "GEMINI_VISION"
    ai_offline: bool = False
    ai_status_message: Optional[str] = None

    model_config = {"extra": "allow"}


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
    sender_account: Optional[str] = None
    transaction_date: Optional[str] = None
    transaction_time: Optional[str] = None
    confidence: float = 0.95
    originality_score: float = 0.95
    tampering_detected: bool = False
    authenticity_verdict: str = "GENUINE"
    raw_text: Optional[str] = None
    field_evidence: Optional[Dict[str, Any]] = None
    authenticity_indicators: Optional[Dict[str, Any]] = None
    missing_fields: List[str] = Field(default_factory=list)
    backend_validation_status: Optional[str] = "VALID_CLAIM"
    ai_engine: str = "GEMINI_VISION"
    ai_offline: bool = False
    ai_status_message: Optional[str] = None

    model_config = {"extra": "allow"}


class ExtractedReceiptClaim(BaseModel):
    """Internal normalized receipt claim produced by AI / OCR layer."""
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
    transaction_type: Optional[str] = "TRANSFER"
    narration: Optional[str] = None
    status_text: Optional[str] = None
    confidence: float = 0.95
    originality_score: float = 0.95
    tampering_detected: bool = False
    authenticity_verdict: str = "GENUINE"
    raw_text: str = ""
    field_evidence: Dict[str, Any] = Field(default_factory=dict)
    authenticity_indicators: Dict[str, Any] = Field(default_factory=dict)
    missing_fields: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    backend_validation_status: str = "VALID_CLAIM"
    ai_engine: str = "GEMINI_VISION"
    ai_offline: bool = False
    ai_status_message: Optional[str] = None

    model_config = {"extra": "allow"}
