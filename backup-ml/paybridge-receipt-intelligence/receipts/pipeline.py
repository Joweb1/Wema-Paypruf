"""Receipt Intelligence pipeline orchestrator.

Public entry point:

    from receipts.pipeline import process_receipt
    result = process_receipt(image_bytes)        # -> dict (the contract)

The steps, in order (implemented across Phases 3-7):

    1. Image Validation      -> validation.validate_image()         (Phase 3)
    2. Image Preprocessing   -> preprocessing.prepare()            (Phase 3)
    3. Vision Extraction     -> extractors.gemini.GeminiExtractor    (Phase 4)
    4. Raw Fields            -> (from the model, structured)        (Phase 4)
    5. Normalization         -> normalize.normalize_fields()        (Phase 5)
    6. Field Validation      -> validate_fields.validate_claim()    (Phase 5)
    7. Confidence Scoring    -> confidence.score()                  (Phase 6)
    8. Warnings              -> warnings.build()                    (Phase 6)
    9. Structured JSON       -> models.ExtractionResult             (Phase 4/7)

This module never decides genuineness; confidence is EXTRACTION confidence.
"""

from __future__ import annotations

from receipts import confidence, normalize, warnings
from receipts.config import load_settings
from receipts.exceptions import ReceiptError
from receipts.extractors.fields import extract_fields
from receipts.extractors.ocr import extract_text
from receipts.preprocessing import prepare
from receipts.validate_fields import validate_fields
from receipts.validation import validate_image


def process_receipt(image_bytes: bytes, *, filename: str | None = None) -> dict:
    """Run the full extraction pipeline on one receipt image.

    Returns the structured payment-claim contract described in the README
    (keys: success, fields, confidence, overall_confidence, warnings).

    Extraction confidence describes extraction quality only; it does not
    determine payment genuineness or backend transaction status.
    """
    try:
        settings = load_settings()
        validated_image = validate_image(
            image_bytes,
            filename=filename,
            max_file_mb=settings.max_file_mb,
            max_dimension=settings.max_dimension,
            hard_dimension_cap=settings.hard_dimension_cap,
        )
        prepared_image = prepare(
            validated_image,
            max_dimension=settings.max_dimension,
        )
        raw_text = extract_text(
            prepared_image,
            filename=filename,
            model=settings.model,
        )
        print("\n===== PIPELINE RAW OCR =====")
        print(raw_text)

        extracted_fields = extract_fields(raw_text)

        print("\n===== PIPELINE EXTRACTED =====")
        print(extracted_fields)

        normalized_fields = normalize.normalize_fields(extracted_fields)

        print("\n===== PIPELINE NORMALIZED =====")
        print(normalized_fields)

        validation_result = validate_fields(normalized_fields)
        confidence_result = confidence.calculate_confidence(
            normalized_fields,
            validation_result,
        )
        warning_result = warnings.generate_warnings(
            normalized_fields,
            validation_result,
            confidence_result,
        )

        return {
            "success": True,
            "fields": normalized_fields,
            "validation": validation_result,
            "confidence": confidence_result,
            "warnings": warning_result,
        }
    except ReceiptError as error:
        return {
            "success": False,
            "error": error.message,
            "code": error.code,
        }
