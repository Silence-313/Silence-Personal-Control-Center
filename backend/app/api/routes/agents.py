"""Agent registry + session read-model endpoints (read-only, require_access)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.schemas.agent import AgentOut, AgentSessionOut
from app.services import agent_service, session_service
from app.db.database import get_session

router = APIRouter(
    prefix="/api/v1/agents",
    tags=["agents"],
    dependencies=[Depends(require_access)],
)


@router.get("", response_model=list[AgentOut])
def list_agents() -> list[AgentOut]:
    return agent_service.list_agents()


@router.get("/{agent_id}", response_model=AgentOut)
def get_agent(agent_id: str) -> AgentOut:
    agent = agent_service.get_agent(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("/{agent_id}/sessions", response_model=list[AgentSessionOut])
def list_agent_sessions(
    agent_id: str, session: Session = Depends(get_session)
) -> list[AgentSessionOut]:
    if agent_service.get_agent(agent_id) is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    # Phase 8: sessions now live in the SQLite Session Plane (seeded from the
    # agents.yaml registry); response shape is unchanged (add-only).
    return session_service.list_by_agent(session, agent_id)