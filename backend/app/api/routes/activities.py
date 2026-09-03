"""Activity timeline endpoints."""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.schemas.activity import ActivityOut
from app.services import activity_service

router = APIRouter(
    prefix="/api/v1/activities",
    tags=["activities"],
    dependencies=[Depends(require_access)],
)


def _to_out(a) -> ActivityOut:
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
    )


@router.get("", response_model=list[ActivityOut])
def list_activities(session: Session = Depends(get_session)) -> list[ActivityOut]:
    return [_to_out(a) for a in activity_service.recent(session)]