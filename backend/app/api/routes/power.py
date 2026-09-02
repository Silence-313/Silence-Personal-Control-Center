"""Power status endpoint for a node."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.models.node import Node
from app.schemas.power import PowerOut
from app.services import power_service

router = APIRouter(
    prefix="/api/v1/nodes/{node_id}/power",
    tags=["power"],
    dependencies=[Depends(require_access)],
)


@router.get("", response_model=PowerOut)
def get_power(node_id: str, session: Session = Depends(get_session)) -> PowerOut:
    if session.get(Node, node_id) is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return power_service.status()