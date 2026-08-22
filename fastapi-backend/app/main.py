"""PayPruf FastAPI Application Entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import SessionLocal, init_db
from app.seed.initial_data import seed_initial_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan context."""
    # 1. Initialize Database Tables
    init_db()

    # 2. Seed Initial Demo Data
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="PayPruf API",
    version="1.0.0",
    description="PayPruf API - OCR Receipt Extraction, Multi-Identifier Auth, and Bank Ledger Reconciliation.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also mount under /api for proxy compatibility
app.include_router(api_router, prefix="/api")


@app.get("/", tags=["Health"])
def root():
    return {
        "app": "PayPruf API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
