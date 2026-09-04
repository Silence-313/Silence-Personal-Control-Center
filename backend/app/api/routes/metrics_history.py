"""Metrics history query endpoints (Phase 10 Step 2, read-only)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.metrics_history import service as metrics_history_service
from app.metrics_history.schemas import MetricSampleOut, MetricsSummaryOut
from app.models.node import Node

router = APIRouter(
    prefix="/api/v1/metrics",
    tags=["metrics"],
    dependencies=[Depends(require_access)],
)

_DEFAULT_LIMIT = 500
_MAX_LIMIT = 5000
_SUMMARY_RANGES = frozenset({"1h", "6h", "24h", "7d"})


def _parse_dt(value: str | None) -> datetime | None:
    """Parse an ISO-8601 timestamp; ``None`` (ignore filter) on bad input."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


@router.get("/history", response_model=list[MetricSampleOut])
def history(
    node_id: str,
    start: str | None = None,
    end: str | None = None,
    limit: int = _DEFAULT_LIMIT,
    session: Session = Depends(get_session),
) -> list[MetricSampleOut]:
    if session.get(Node, node_id) is None:
        raise HTTPException(status_code=404, detail="Node not found")
    limit = max(1, min(limit, _MAX_LIMIT))
    return metrics_history_service.list_history(
        session,
        node_id=node_id,
        start=_parse_dt(start),
        end=_parse_dt(end),
        limit=limit,
    )


@router.get("/summary", response_model=MetricsSummaryOut)
def summary(
    node_id: str,
    range: str = "24h",
    session: Session = Depends(get_session),
) -> MetricsSummaryOut:
    if session.get(Node, node_id) is None:
        raise HTTPException(status_code=404, detail="Node not found")
    if range not in _SUMMARY_RANGES:
        range = "24h"
    return metrics_history_service.get_summary(session, node_id=node_id, range_=range)