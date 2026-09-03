"""Session Plane endpoints (read-only, require_access)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.schemas.session import SessionOut
from app.services import session_service

router = APIRouter(
    prefix="/api/v1/sessions",
    tags=["sessions"],
    dependencies=[Depends(require_access)],
)


@router.get("", response_model=list[SessionOut])
def list_sessions(session: Session = Depends(get_session)) -> list[SessionOut]:
    return session_service.list_all(session)


@router.get("/{session_id}", response_model=SessionOut)
def get_session_detail(
    session_id: str, session: Session = Depends(get_session)
) -> SessionOut:
    out = session_service.get(session, session_id)
    if out is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return out