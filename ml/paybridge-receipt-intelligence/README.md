# PayBridge Receipt Intelligence

PayBridge Receipt Intelligence is the AI-powered receipt processing service for the PayBridge platform.

It receives a receipt image, extracts the transaction information using Gemini Vision, converts the extracted information into structured fields, validates the fields, calculates extraction confidence, and returns a JSON response that can be consumed by the PayBridge frontend/backend.

## What This Service Does

The receipt intelligence pipeline performs the following steps:

1. Receipt image validation
2. Image preprocessing
3. OCR / text extraction using Gemini Vision
4. Deterministic field extraction
5. Field normalization
6. Structural validation
7. Extraction confidence scoring
8. Warning generation
9. Structured JSON response

### Important

This service determines **what information a receipt claims**.

It does **not** currently determine whether a payment is genuinely successful by checking a bank's transaction database.

---

# Architecture

```text
Receipt Image
     │
     ▼
Image Validation
     │
     ▼
Image Preprocessing
     │
     ▼
Gemini Vision OCR
     │
     ▼
Raw OCR Text
     │
     ▼
Field Extraction
     │
     ▼
Normalization
     │
     ▼
Field Validation
     │
     ▼
Confidence Scoring
     │
     ▼
Warnings
     │
     ▼
Structured JSON