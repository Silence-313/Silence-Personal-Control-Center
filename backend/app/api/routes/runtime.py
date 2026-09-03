"""Runtime State endpoint (READ-ONLY, require_access)."""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.schemas.runtime import RuntimeStateOut
from app.services import research_observer, runtime_service

router = APIRouter(
    prefix="/api/v1/runtime",
    tags=["runtime"],
    dependencies=[Depends(require_access)],
)


@router.get("/state", response_model=RuntimeStateOut)
def get_runtime_state(session: Session = Depends(get_session)) -> RuntimeStateOut:
    state = runtime_service.runtime_state(session)
    # Commit any observation change events triggered by aggregation into the
    # Activity spine (internal write path; idempotent drain).
    research_observer.drain_changes(session)
    return state