"""Docker/services read-only endpoint for a node."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.models.node import Node
from app.schemas.services import ServicesOut
from app.services import docker_service

router = APIRouter(
    prefix="/api/v1/nodes/{node_id}/services",
    tags=["services"],
    dependencies=[Depends(require_access)],
)


@router.get("", response_model=ServicesOut)
def get_services(node_id: str, session: Session = Depends(get_session)) -> ServicesOut:
    if session.get(Node, node_id) is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return docker_service.snapshot()