"""Health endpoints."""

from fastapi import APIRouter
from sqlalchemy import text

from app.db.database import engine
from app.schemas.health import ApiHealthResponse, HealthResponse
from app.services import power_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", display_on=power_service.display_on())


@router.get("/api/v1/health", response_model=ApiHealthResponse, tags=["health"])
def api_health() -> ApiHealthResponse:
    database = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        database = "error"
    return ApiHealthResponse(
        status="ok" if database == "ok" else "degraded",
        database=database,
    )