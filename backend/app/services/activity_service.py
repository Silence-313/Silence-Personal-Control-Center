"""Activity timeline / audit record service."""

import logging
from uuid import uuid4

from sqlmodel import Session, select

from app.models.command import Activity

logger = logging.getLogger("silence.backend.activity")


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
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


def recent(session: Session, limit: int = 50) -> list[Activity]:
    return list(
        session.exec(
            select(Activity).order_by(Activity.timestamp.desc()).limit(limit)
        ).all()
    )