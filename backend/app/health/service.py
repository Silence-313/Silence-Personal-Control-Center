"""Health Intelligence service (Phase 10 Step 3).

Computes a coarse, rule-based health score (no ML): offline nodes deduct,
recent error activities deduct, and stopped Docker containers deduct. Every
function is defensive — no exception leaks, safe on an empty database, and
``include_services=False`` avoids the Docker subprocess (used by the heartbeat
sampler and unit tests for determinism).
"""

import logging
import re
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlmodel import Session, select

from app.core.config import settings
from app.health.models import HealthSnapshot
from app.health.schemas import (
    HealthSummaryOut,
    NodeHealthOut,
    RecentErrorOut,
    ServiceHealthOut,
)
from app.models.command import Activity
from app.models.node import Node
from app.services import docker_service, node_service

logger = logging.getLogger("silence.backend.health")

_ERROR_ACTION_RE = re.compile(r"fail|error|crash|exception|degraded|timeout", re.IGNORECASE)

_ERROR_LOOKBACK_HOURS = 24


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _node_health(session: Session) -> NodeHealthOut:
    nodes = session.exec(select(Node)).all()
    online = sum(1 for n in nodes if node_service.computed_status(n.last_seen) == "online")
    return NodeHealthOut(online=online, offline=len(nodes) - online)


def _recent_errors(session: Session) -> list[RecentErrorOut]:
    cutoff = datetime.now() - timedelta(hours=_ERROR_LOOKBACK_HOURS)
    rows = session.exec(
        select(Activity)
        .where(Activity.timestamp >= cutoff)
        .order_by(Activity.timestamp.desc())
    ).all()
    errors = [
        a
        for a in rows
        if getattr(a, "severity", None) == "error" or _ERROR_ACTION_RE.search(a.action or "")
    ]
    return [
        RecentErrorOut(
            id=a.id,
            type=a.type,
            action=a.action,
            message=a.message,
            timestamp=_iso(a.timestamp),
        )
        for a in errors[:20]
    ]


def _services(include_services: bool) -> ServiceHealthOut:
    if not include_services:
        return ServiceHealthOut()
    try:
        snap = docker_service.snapshot()
        return ServiceHealthOut(
            docker_daemon=snap.docker.daemon_running,
            running=snap.docker.containers.running,
            stopped=snap.docker.containers.stopped,
        )
    except Exception:
        return ServiceHealthOut(docker_daemon=False, running=0, stopped=0)


def _score(node: NodeHealthOut, error_count: int, services: ServiceHealthOut) -> int:
    score = 100
    score -= 30 * node.offline
    score -= min(error_count * 5, 30)
    # Service failure deduction only when Docker is actually running containers
    # with some stopped (Docker absent/empty is neutral, not a failure).
    if services.running + services.stopped > 0 and services.stopped > 0:
        score -= 5 * min(services.stopped, 4)
    return max(0, min(100, score))


def compute_summary(session: Session, include_services: bool = True) -> HealthSummaryOut:
    node = _node_health(session)
    services = _services(include_services)
    errors = _recent_errors(session)
    return HealthSummaryOut(
        overall_score=_score(node, len(errors), services),
        node_health=node,
        service_health=services,
        recent_errors=errors,
    )


def record_snapshot(session: Session) -> HealthSnapshot | None:
    """Persist a light snapshot (no Docker) — safe to call every heartbeat tick."""
    try:
        summary = compute_summary(session, include_services=False)
        snap = HealthSnapshot(
            id=uuid4().hex[:12],
            node_id=settings.node_id,
            overall_score=summary.overall_score,
            online=summary.node_health.online,
            offline=summary.node_health.offline,
            error_count=len(summary.recent_errors),
        )
        session.add(snap)
        session.commit()
        session.refresh(snap)
        return snap
    except Exception:
        session.rollback()
        logger.exception("failed to record health snapshot")
        return None