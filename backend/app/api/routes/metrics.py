"""System metrics endpoint for a node."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.models.node import Node
from app.schemas.metrics import MetricsOut
from app.services import metrics_service

router = APIRouter(
    prefix="/api/v1/nodes/{node_id}/metrics",
    tags=["metrics"],
    dependencies=[Depends(require_access)],
)


@router.get("", response_model=MetricsOut)
def get_metrics(node_id: str, session: Session = Depends(get_session)) -> MetricsOut:
    if session.get(Node, node_id) is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return metrics_service.collect()