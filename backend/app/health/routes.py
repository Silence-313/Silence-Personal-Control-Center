"""Health Intelligence endpoint (Phase 10 Step 3)."""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.health import service as health_service
from app.health.schemas import HealthSummaryOut

router = APIRouter(
    prefix="/api/v1/health",
    tags=["health"],
    dependencies=[Depends(require_access)],
)


@router.get("/summary", response_model=HealthSummaryOut)
def health_summary(session: Session = Depends(get_session)) -> HealthSummaryOut:
    return health_service.compute_summary(session, include_services=True)