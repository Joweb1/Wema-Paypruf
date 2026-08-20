"""Centralized runtime configuration loaded from environment variables.

Keeps env parsing in one place so pipeline modules don't repeat os.getenv.
Defaults are intentionally hackathon-safe (deterministic, bounded).

Reads .env automatically via python-dotenv at call time.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _str(name: str, default: str) -> str:
    return os.getenv(name, default) or default


@dataclass(frozen=True)
class Settings:
    model: str
    temperature: float
    timeout_seconds: int
    max_retries: int
    max_file_mb: int
    max_dimension: int            # downscale threshold (px)
    hard_dimension_cap: int       # reject above this (memory safety)
    api_host: str
    api_port: int
    tesseract_cmd: str
    google_api_key: str


def load_settings() -> Settings:
    """Load settings from environment (and .env if present)."""
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except Exception:  # noqa: BLE001
        pass

    max_dim = _int("RECEIPT_MAX_DIMENSION", 3000)
    return Settings(
        model=_str("RECEIPT_MODEL", "gemini-2.0-flash"),
        temperature=_float("RECEIPT_TEMPERATURE", 0.0),
        timeout_seconds=_int("RECEIPT_TIMEOUT_SECONDS", 30),
        max_retries=_int("RECEIPT_MAX_RETRIES", 2),
        max_file_mb=_int("RECEIPT_MAX_FILE_MB", 8),
        max_dimension=max_dim,
        hard_dimension_cap=max_dim * 4,  # reject extremely large images (memory)
        api_host=_str("API_HOST", "127.0.0.1"),
        api_port=_int("API_PORT", 8082),
        tesseract_cmd=_str("TESSERACT_CMD", ""),
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
    )
