"""FastAPI app for the Receipt Intelligence service.

Phase 2 scaffold:
  - GET  /health               -> live
  - POST /receipts/extract     -> 501 until the pipeline is wired in (Phase 7)

Run:
  uvicorn api.main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from receipts.exceptions import ReceiptError
from receipts.pipeline import process_receipt

app = FastAPI(
    title="PayBridge Receipt Intelligence",
    version="0.1.0",
    description=(
        "Extract a structured payment claim from a receipt image. "
        "Returns what the receipt CLAIMS — verification is the backend's job. "
        "Never returns REAL/FAKE/FRAUD."
    ),
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "receipt-intelligence",
        "version": app.version,
    }


@app.post("/receipts/extract")
async def extract_receipt(image: UploadFile = File(...)) -> dict:
    """Phase 7 will route this to receipts.pipeline.process_receipt."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Receipt extraction endpoint is implemented in Phase 7.",
    )


def _failure_status(result: dict) -> int:
    code = str(result.get("code", ""))
    if code.startswith("IMAGE") or code == "INVALID_IMAGE":
        return status.HTTP_400_BAD_REQUEST
    if code.startswith("OCR"):
        return status.HTTP_502_BAD_GATEWAY
    return status.HTTP_422_UNPROCESSABLE_ENTITY


@app.post("/receipts/analyze")
async def analyze_receipt(image: UploadFile = File(...)) -> dict:
    """Analyze one uploaded receipt through the existing pipeline."""
    try:
        image_bytes = await image.read()
        result = process_receipt(image_bytes, filename=image.filename)
    except ReceiptError as error:
        result = {
            "success": False,
            "error": error.message,
            "code": error.code,
        }

    if not result.get("success", False):
        return JSONResponse(
            status_code=_failure_status(result),
            content=result,
        )

    return result
