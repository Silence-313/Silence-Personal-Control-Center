"""Event Timeline endpoint (Phase 10 Step 4, read-only).

Unified timeline query over the Activity spine with severity/category/source
filters. ``source`` maps to the producer ``type`` (the v0.1 source marker).
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.schemas.activity import ActivityOut
from app.services import activity_service

router = APIRouter(
    prefix="/api/v1/events",
    tags=["events"],
    dependencies=[Depends(require_access)],
)

_TIMELINE_DEFAULT_LIMIT = 100


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


@router.get("/timeline", response_model=list[ActivityOut])
def timeline(
    severity: str | None = None,
    category: str | None = None,
    source: str | None = None,
    start: str | None = None,
    end: str | None = None,
    limit: int = _TIMELINE_DEFAULT_LIMIT,
    session: Session = Depends(get_session),
) -> list[ActivityOut]:
    rows = activity_service.query_timeline(
        session,
        severity=severity,
        category=category,
        source=source,
        start=_parse_dt(start),
        end=_parse_dt(end),
        limit=limit,
    )
    return [activity_service.to_out(r) for r in rows]