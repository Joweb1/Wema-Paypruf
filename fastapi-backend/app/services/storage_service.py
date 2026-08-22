"""File and Media Storage Service for uploaded receipts and PDF documents."""

from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile

from app.core.config import settings


class StorageService:
    """Handles local disk and optional cloud storage for uploaded receipts."""

    def __init__(self, upload_dir: str = settings.UPLOAD_DIR) -> None:
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload_file(self, upload_file: UploadFile) -> Tuple[str, str, int]:
        """Save an uploaded FastAPI file to disk and return (filename, file_path, size_bytes)."""
        ext = Path(upload_file.filename or "receipt.png").suffix.lower()
        if not ext:
            ext = ".png"
        
        unique_filename = f"receipt_{uuid.uuid4().hex[:16]}{ext}"
        target_path = self.upload_dir / unique_filename

        size_bytes = 0
        with open(target_path, "wb") as out_file:
            # Read in chunks
            upload_file.file.seek(0)
            while content := upload_file.file.read(1024 * 64):
                size_bytes += len(content)
                out_file.write(content)

        return unique_filename, str(target_path), size_bytes

    def get_file_path(self, filename: str) -> Optional[Path]:
        """Resolve a filename to its absolute path on disk."""
        target_path = self.upload_dir / filename
        if target_path.is_file():
            return target_path
        
        # Also check fixtures if needed
        fixture_path = Path(settings.UPLOAD_DIR).parent.parent / "fixtures" / filename
        if fixture_path.is_file():
            return fixture_path
        return None

    def get_preview_url(self, filename: str) -> str:
        """Construct a relative media asset URL."""
        return f"/api/v1/assets/{filename}"


storage_service = StorageService()
