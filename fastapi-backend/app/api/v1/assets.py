"""Media Asset Serving Endpoints."""

from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.services.storage_service import storage_service

router = APIRouter(prefix="/assets", tags=["Media Assets"])


@router.get("/{filename}")
def get_asset_file(filename: str):
    """Serve uploaded receipt image or PDF."""
    file_path = storage_service.get_file_path(filename)
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media file not found."
        )

    mime_type = "image/png"
    if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
        mime_type = "image/jpeg"
    elif filename.lower().endswith(".pdf"):
        mime_type = "application/pdf"

    return FileResponse(file_path, media_type=mime_type)
