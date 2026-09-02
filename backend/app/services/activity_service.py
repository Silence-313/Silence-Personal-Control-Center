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
) -> Activity:
    activity = Activity(
        id=uuid4().hex[:12],
        type=type_,
        action=action,
        message=message,
        node_id=node_id,
        command_id=command_id,
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