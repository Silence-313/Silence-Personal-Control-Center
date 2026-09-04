"""Activity timeline / audit record service."""

import logging
import re
from uuid import uuid4

from sqlmodel import Session, select

from app.models.command import Activity
from app.schemas.activity import ActivityOut

logger = logging.getLogger("silence.backend.activity")

_SEVERITY_ERROR_RE = re.compile(r"fail|error|crash|exception|degraded", re.IGNORECASE)
_SEVERITY_WARNING_RE = re.compile(r"warn|timeout|missing|stale|unknown|offline", re.IGNORECASE)

_TIMELINE_MAX_LIMIT = 1000
_TIMELINE_DEFAULT_LIMIT = 100


def derive_severity(action: str) -> str:
    """Coarse severity from the action verb (info | warning | error)."""
    a = action or ""
    if _SEVERITY_ERROR_RE.search(a):
        return "error"
    if _SEVERITY_WARNING_RE.search(a):
        return "warning"
    return "info"


def derive_category(type_: str) -> str:
    """Category mirrors the producer type (stable taxonomy in v0.1)."""
    return (type_ or "system").lower()


def record(
    session: Session,
    *,
    type_: str,
    action: str,
    message: str,
    node_id: str | None = None,
    command_id: str | None = None,
    project_id: str | None = None,
    agent_id: str | None = None,
    session_id: str | None = None,
    research_project_id: str | None = None,
    severity: str | None = None,
    category: str | None = None,
) -> Activity:
    """Controlled, internal-only write path for the Activity spine.

    Every Activity flows through here; there is no public free-form endpoint.
    Association fields are populated by system producers only when known
    (session lifecycle, observation results, command lifecycle); unknown
    associations stay ``None``. Callers must not inject arbitrary strings.
    """
    activity = Activity(
        id=uuid4().hex[:12],
        type=type_,
        action=action,
        message=message,
        node_id=node_id,
        command_id=command_id,
        project_id=project_id,
        agent_id=agent_id,
        session_id=session_id,
        research_project_id=research_project_id,
        severity=severity if severity is not None else derive_severity(action),
        category=category if category is not None else derive_category(type_),
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)

    # Phase 9: fire the `activity.created` automation trigger (lazy import to
    # avoid a circular dependency; automation-originated activities are excluded).
    from app.automation import engine as automation_engine

    automation_engine.on_activity_created(session, activity)
    # The hook may commit (expiring the session); reload so callers receive a
    # usable object after `record` returns.
    session.refresh(activity)
    return activity


def recent(session: Session, limit: int = 50) -> list[Activity]:
    return list(
        session.exec(
            select(Activity).order_by(Activity.timestamp.desc()).limit(limit)
        ).all()
    )


def query_timeline(
    session: Session,
    *,
    severity: str | None = None,
    category: str | None = None,
    source: str | None = None,
    start=None,
    end=None,
    limit: int = _TIMELINE_DEFAULT_LIMIT,
) -> list[Activity]:
    """Timeline query (newest-first) with severity/category/source/time filters.

    ``source`` maps to the producer ``Activity.type`` (the v0.1 source marker).
    """
    stmt = select(Activity).order_by(Activity.timestamp.desc())
    if severity:
        stmt = stmt.where(Activity.severity == severity)
    if category:
        stmt = stmt.where(Activity.category == category)
    if source:
        stmt = stmt.where(Activity.type == source)
    if start is not None:
        stmt = stmt.where(Activity.timestamp >= start)
    if end is not None:
        stmt = stmt.where(Activity.timestamp <= end)
    limit = max(1, min(limit, _TIMELINE_MAX_LIMIT))
    return list(session.exec(stmt.limit(limit)).all())


def get(session: Session, activity_id: str) -> Activity | None:
    return session.get(Activity, activity_id)


def to_out(a: Activity) -> ActivityOut:
    """Map an Activity row to its read model (idempotent; shared helper)."""
    return ActivityOut(
        id=a.id,
        type=a.type,
        action=a.action,
        message=a.message,
        timestamp=a.timestamp,
        node_id=a.node_id,
        command_id=a.command_id,
        project_id=a.project_id,
        agent_id=a.agent_id,
        session_id=a.session_id,
        research_project_id=a.research_project_id,
        severity=a.severity,
        category=a.category,
    )