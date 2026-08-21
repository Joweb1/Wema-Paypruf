from __future__ import annotations

import secrets
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent
DEFAULT_DATABASE_PATH = (BACKEND_ROOT / "data" / "paypruf.db").resolve()


class Settings(BaseSettings):
    app_name: str = "PayPruf API"
    app_env: str = "development"
    database_url: str = f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
    frontend_url: str = "http://localhost:5173"
    public_app_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"
    upload_dir: Path = BACKEND_ROOT / "data" / "uploads"
    max_upload_size_bytes: int = Field(default=8 * 1024 * 1024, ge=1024)
    max_image_pixels: int = Field(default=40_000_000, ge=1_000_000)
    max_pdf_pages: int = Field(default=1, ge=1, le=100)
    match_window_hours: int = Field(default=72, ge=1, le=720)
    wema_provider_mode: str = "mock"
    ocr_provider: str = "rapidocr"
    seed_demo_data: bool = True
    log_level: str = "INFO"

    # Authentication / session configuration
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = Field(default=60 * 24 * 7, ge=5, le=60 * 24 * 30)
    auth_cookie_name: str = "paypruf_session"
    auth_rate_limit_per_minute: int = Field(default=12, ge=1, le=120)

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @model_validator(mode="before")
    @classmethod
    def enforce_production_secrets(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        app_env = str(data.get("app_env", "development")).strip().lower()
        jwt_secret = data.get("jwt_secret") or ""
        if app_env in {"production", "prod"} and not str(jwt_secret).strip():
            raise ValueError("JWT_SECRET must be set when APP_ENV is production.")
        return data

    @field_validator("wema_provider_mode")
    @classmethod
    def validate_wema_mode(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized != "mock":
            raise ValueError(
                "Only WEMA_PROVIDER_MODE=mock is available because no documented "
                "sandbox API configuration was supplied."
            )
        return normalized

    @field_validator("jwt_secret")
    @classmethod
    def resolve_jwt_secret(cls, value: str) -> str:
        if value:
            return value
        # A missing secret is only acceptable outside production. In development we
        # generate an ephemeral secret so the app boots; tokens will not survive a
        # restart, which is acceptable for local work. Production must set JWT_SECRET.
        return secrets.token_hex(32)

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() in {"production", "prod"}

    @property
    def cookie_secure(self) -> bool:
        # Secure cookies are required whenever the app is not served over plain HTTP
        # locally. In development the proxy/frontend is HTTP, so we keep it permissive.
        return self.is_production

    @field_validator("frontend_url", "public_app_url")
    @classmethod
    def strip_url_suffix(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @field_validator("upload_dir", mode="before")
    @classmethod
    def normalize_upload_dir(cls, value: object) -> Path:
        path = Path(value) if value is not None else BACKEND_ROOT / "data" / "uploads"
        if not path.is_absolute():
            path = (PROJECT_ROOT / path).resolve()
        return path

    @property
    def allowed_origins(self) -> list[str]:
        values = [item.strip().rstrip("/") for item in self.cors_origins.split(",")]
        return [item for item in values if item]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
