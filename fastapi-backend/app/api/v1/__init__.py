"""API v1 Router Package."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.merchant import router as merchant_router
from app.api.v1.payments import router as payments_router
from app.api.v1.public import router as public_router
from app.api.v1.risk import router as risk_router
from app.api.v1.assets import router as assets_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(merchant_router)
api_router.include_router(payments_router)
api_router.include_router(public_router)
api_router.include_router(risk_router)
api_router.include_router(assets_router)

__all__ = ["api_router"]
