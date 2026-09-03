"""Session Plane service (SQLite-backed, read-model + internal lifecycle).

- Sessions are seeded idempotently from ``config/agents.yaml`` when the table
  is empty (the YAML registry is read-only and never re-written).
- Read access: list all / get by id / list by agent.
- Internal-only lifecycle: ``create`` and ``transition`` exist for real future
  producers and tests. No synthetic lifecycle events are generated here and no
  public endpoint exposes these operations.
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session as DbSession, select

from app.core.config import settings
from app.models.session import SessionRecord
from app.schemas.agent import AgentSessionOut
from app.services import activity_service, agent_service

logger = logging.getLogger("silence.backend.session")

SESSION_STATUSES = {"created", "running", "completed", "failed", "cancelled"}


def _to_dt(value) -> datetime | None:
    """Normalise an ISO 8601 string or datetime to naive-UTC datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).rstrip("Z"))
        except ValueError:
            logger.warning("unparsable datetime", extra={"value": str(value)})
            return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _to_iso(dt: datetime) -> str:
    """Serialise a stored datetime back to ISO 8601 with a Z suffix."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.isoformat() + "Z"


def _now() -> datetime:
    return _to_dt(datetime.now(timezone.utc))


def to_out(rec: SessionRecord) -> AgentSessionOut:
    return AgentSessionOut(
        id=rec.id,
        agent_id=rec.agent_id,
        node_id=rec.node_id,
        project_id=rec.project_id,
        research_project_id=rec.research_project_id,
        status=rec.status,
        started_at=_to_iso(rec.started_at),
        ended_at=_to_iso(rec.ended_at) if rec.ended_at is not None else None,
        last_activity_at=_to_iso(rec.last_activity_at),
        current_task=rec.current_task,
    )


def seed_from_registry(session: DbSession) -> int:
    """Idempotent seed: import registry sessions only when the table is empty.

    Returns the number of rows inserted (0 when already seeded). YAML is read
    only; nothing is ever written back to the registry.
    """
    existing = session.exec(select(SessionRecord.id)).all()
    if existing:
        logger.debug("session plane already seeded; skipping")
        return 0
    entries = agent_service.load_registry().get("sessions") or []
    seen: set[str] = set()
    count = 0
    for entry in entries:
        sid = str(entry.get("id", ""))
        if not sid or sid in seen:
            continue
        seen.add(sid)
        started = _to_dt(entry.get("started_at"))
        ended = _to_dt(entry.get("ended_at"))
        last = _to_dt(entry.get("last_activity_at")) or started or _now()
        session.add(
            SessionRecord(
                id=sid,
                agent_id=str(entry.get("agent_id", "")),
                node_id=str(entry.get("node_id") or settings.node_id),
                project_id=entry.get("project_id"),
                research_project_id=entry.get("research_project_id"),
                status=str(entry.get("status", "created")),
                started_at=started or _now(),
                ended_at=ended,
                last_activity_at=last,
                current_task=entry.get("current_task"),
            )
        )
        count += 1
    if count:
        session.commit()
        logger.info("session plane seeded", extra={"count": count})
    return count


def list_all(session: DbSession) -> list[AgentSessionOut]:
    rows = session.exec(
        select(SessionRecord).order_by(SessionRecord.started_at.desc())
    ).all()
    return [to_out(r) for r in rows]


def get(session: DbSession, session_id: str) -> AgentSessionOut | None:
    rec = session.get(SessionRecord, session_id)
    return to_out(rec) if rec is not None else None


def list_by_agent(session: DbSession, agent_id: str) -> list[AgentSessionOut]:
    rows = session.exec(
        select(SessionRecord)
        .where(SessionRecord.agent_id == agent_id)
        .order_by(SessionRecord.started_at.desc())
    ).all()
    return [to_out(r) for r in rows]


def create(
    session: DbSession,
    *,
    agent_id: str,
    node_id: str | None = None,
    project_id: str | None = None,
    research_project_id: str | None = None,
    status: str = "created",
    started_at: datetime | None = None,
    current_task: str | None = None,
) -> AgentSessionOut:
    """Internal-only lifecycle create (no public HTTP path)."""
    if status not in SESSION_STATUSES:
        raise ValueError(f"invalid session status: {status}")
    rec = SessionRecord(
        id=uuid4().hex[:12],
        agent_id=agent_id,
        node_id=node_id or settings.node_id,
        project_id=project_id,
        research_project_id=research_project_id,
        status=status,
        started_at=_to_dt(started_at) if started_at is not None else _now(),
        ended_at=None,
        last_activity_at=_now(),
        current_task=current_task,
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    logger.info("session created", extra={"session_id": rec.id, "agent_id": agent_id})
    activity_service.record(
        session,
        type_="session",
        action="created",
        message=f"Session {rec.id} created",
        node_id=rec.node_id,
        agent_id=agent_id,
        session_id=rec.id,
        project_id=project_id,
        research_project_id=research_project_id,
    )
    return to_out(rec)


def transition(
    session: DbSession,
    session_id: str,
    *,
    status: str | None = None,
    ended_at: datetime | None = None,
    last_activity_at: datetime | None = None,
    current_task: str | None = None,
) -> AgentSessionOut | None:
    """Internal-only status transition (no public HTTP path).

    Terminal statuses auto-fill ``ended_at`` when it is not explicitly given.
    """
    rec = session.get(SessionRecord, session_id)
    if rec is None:
        return None
    if status is not None:
        if status not in SESSION_STATUSES:
            raise ValueError(f"invalid session status: {status}")
        rec.status = status
        if status in {"completed", "failed", "cancelled"} and rec.ended_at is None:
            rec.ended_at = ended_at or _now()
    if ended_at is not None:
        rec.ended_at = _to_dt(ended_at)
    if last_activity_at is not None:
        rec.last_activity_at = _to_dt(last_activity_at) or _now()
    if current_task is not None:
        rec.current_task = current_task
    session.add(rec)
    session.commit()
    session.refresh(rec)
    logger.info("session transitioned", extra={"session_id": rec.id, "status": rec.status})
    activity_service.record(
        session,
        type_="session",
        action=rec.status,
        message=f"Session {rec.id} {rec.status}",
        node_id=rec.node_id,
        agent_id=rec.agent_id,
        session_id=rec.id,
        project_id=rec.project_id,
        research_project_id=rec.research_project_id,
    )
    return to_out(rec)