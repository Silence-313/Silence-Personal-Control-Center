"""Unified Context endpoints (READ-ONLY, require_access)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.schemas.context import AgentContextProviderOut, ContextOut
from app.services import context_service

router = APIRouter(
    prefix="/api/v1/context",
    tags=["context"],
    dependencies=[Depends(require_access)],
)


@router.get("/provider/{agent_id}", response_model=AgentContextProviderOut)
def get_agent_provider(
    agent_id: str, session: Session = Depends(get_session)
) -> AgentContextProviderOut:
    out = context_service.provider(session, agent_id)
    if out is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return out


@router.get("/{type}/{id}", response_model=ContextOut)
def get_context(type: str, id: str, session: Session = Depends(get_session)) -> ContextOut:
    out = context_service.get_context(session, type, id)
    if out is None:
        raise HTTPException(status_code=404, detail="Context not found")
    return out