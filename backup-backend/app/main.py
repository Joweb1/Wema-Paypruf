from __future__ import annotations

import logging
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from backend.app.api.auth import router as auth_router
from backend.app.api.merchant import router as merchant_router
from backend.app.api.routes import router
from backend.app.core.config import Settings, get_settings
from backend.app.core.errors import AppError, error_envelope
from backend.app.core.logging import configure_logging
from backend.app.db import Database, create_database
from backend.app.providers.wema import WemaTransactionProvider, create_wema_provider
from backend.app.seed import seed_demo_data
from backend.app.services.extraction import LazyReceiptExtractor

logger = logging.getLogger(__name__)
PUBLIC_TOKEN_PATH = re.compile(r"(/api/public/payments/)[^/]+")


def _safe_request_path(path: str) -> str:
    return PUBLIC_TOKEN_PATH.sub(r"\1[token]", path)


def create_app(
    settings: Settings | None = None,
    *,
    database: Database | None = None,
    receipt_extractor: Any | None = None,
    wema_provider: WemaTransactionProvider | None = None,
) -> FastAPI:
    app_settings = settings or get_settings()
    configure_logging(app_settings.log_level)
    app_database = database or create_database(app_settings.database_url)
    app_extractor = receipt_extractor or LazyReceiptExtractor()
    app_provider = wema_provider or create_wema_provider(app_settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        app_database.create_schema()
        app_settings.upload_dir.mkdir(parents=True, exist_ok=True)
        if app_settings.seed_demo_data:
            with app_database.session_factory() as session:
                seed_demo_data(session, app_settings)
        yield
        app_database.engine.dispose()

    app = FastAPI(
        title=app_settings.app_name,
        version="1.0.0",
        description=(
            "Receipt intelligence plus merchant-side payment verification for PayPruf. "
            "OCR is supporting evidence and never confirms a payment by itself."
        ),
        lifespan=lifespan,
    )
    app.state.settings = app_settings
    app.state.database = app_database
    app.state.receipt_extractor = app_extractor
    app.state.wema_provider = app_provider

    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Accept", "Content-Type", "X-Request-ID", "Cookie"],
    )

    @app.middleware("http")
    async def request_logging(request: Request, call_next):
        started = time.perf_counter()
        request_id = uuid.uuid4().hex
        safe_path = _safe_request_path(request.url.path)
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "request_failed",
                extra={
                    "event": "request_failed",
                    "request_id": request_id,
                    "method": request.method,
                    "path": safe_path,
                },
            )
            raise
        response.headers["X-Request-ID"] = request_id
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        logger.info(
            "request_completed",
            extra={
                "event": "request_completed",
                "request_id": request_id,
                "method": request.method,
                "path": safe_path,
                "status_code": response.status_code,
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            },
        )
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_envelope(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = [
            {
                "field": ".".join(str(part) for part in error.get("loc", ())),
                "message": error.get("msg", "Invalid value."),
                "type": error.get("type", "validation_error"),
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=error_envelope(
                "VALIDATION_ERROR", "The request contains invalid data.", details
            ),
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
        if exc.status_code == 404:
            return JSONResponse(
                status_code=404,
                content=error_envelope("NOT_FOUND", "The requested resource was not found."),
            )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_envelope("HTTP_ERROR", str(exc.detail)),
            headers=exc.headers,
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error_handler(_: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.exception("database_error", extra={"event": "database_error"})
        return JSONResponse(
            status_code=503,
            content=error_envelope(
                "DATABASE_UNAVAILABLE",
                "PayPruf could not access its payment records. Please try again.",
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error", extra={"event": "unhandled_error"})
        return JSONResponse(
            status_code=500,
            content=error_envelope(
                "INTERNAL_ERROR",
                "PayPruf could not complete the request. Please try again.",
            ),
        )

    app.include_router(router)
    app.include_router(auth_router)
    app.include_router(merchant_router)
    return app


app = create_app()

