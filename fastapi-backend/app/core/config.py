"""Application configuration management using Pydantic Settings."""

from __future__ import annotations

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Configuration settings for PayPruf FastAPI backend.
    
    Supports:
    - Local PostgreSQL (e.g. postgresql+psycopg2://postgres:postgres@localhost:5432/paypruf)
    - Supabase PostgreSQL (e.g. postgresql+psycopg2://postgres:[password]@db.[ref].supabase.co:5432/postgres)
    - SQLite Fallback (e.g. sqlite:///./data/paypruf.db) for zero-configuration testing.
    """

    APP_NAME: str = "PayPruf API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database: Supports Local PostgreSQL, Supabase PostgreSQL, or SQLite fallback
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/paypruf.db"

    # Supabase specific settings (Optional - if using Supabase client/storage)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # JWT Authentication
    JWT_SECRET: str = "paypruf_secure_jwt_secret_key_2026_super_secret_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Google Gemini AI Multi-Key Pool (with automatic failover)
    GEMINI_API_KEY: str = ""
    GEMINI_BACKUP_KEYS: str = ""
    GEMINI_MODEL: str = "gemini-flash-latest"

    # Storage & Uploads
    UPLOAD_DIR: str = str(BASE_DIR / "uploads" / "receipts")
    MAX_UPLOAD_SIZE_BYTES: int = 8 * 1024 * 1024  # 8MB

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://0.0.0.0:3000",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_gemini_keys(self) -> List[str]:
        """Return all configured Gemini API keys in priority order for automatic failover."""
        keys = []
        if self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip():
            keys.append(self.GEMINI_API_KEY.strip())
        if self.GEMINI_BACKUP_KEYS and self.GEMINI_BACKUP_KEYS.strip():
            for k in self.GEMINI_BACKUP_KEYS.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys:
                    keys.append(k_clean)
        return keys


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(str(BASE_DIR / "data"), exist_ok=True)
