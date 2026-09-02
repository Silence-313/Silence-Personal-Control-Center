"""Node registry endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.dependencies import require_access
from app.db.database import get_session
from app.models.node import Node
from app.schemas.node import NodeHardwareOut, NodeOut
from app.services import hardware_service, node_service

router = APIRouter(
    prefix="/api/v1/nodes",
    tags=["nodes"],
    dependencies=[Depends(require_access)],
)


def _to_out(node: Node) -> NodeOut:
    info = hardware_service.static_info()
    return NodeOut(
        id=node.id,
        name=node.name,
        platform=node.platform,
        architecture=node.architecture,
        os_version=node.os_version,
        status=node_service.computed_status(node.last_seen),
        capabilities=node.capabilities,
        last_seen=node.last_seen,
        model=info["model"],
        ip=hardware_service.local_ip(),
        uptime_seconds=hardware_service.uptime_seconds(),
        hardware=NodeHardwareOut(
            chip=info["chip"],
            cpu_cores=info["cpu_cores"],
            performance_cores=info["performance_cores"],
            efficiency_cores=info["efficiency_cores"],
            memory_gb=info["memory_gb"],
            gpu=info["gpu"],
        ),
    )


@router.get("", response_model=list[NodeOut])
def list_nodes(session: Session = Depends(get_session)) -> list[NodeOut]:
    nodes = session.exec(select(Node)).all()
    return [_to_out(n) for n in nodes]


@router.get("/{node_id}", response_model=NodeOut)
def get_node(node_id: str, session: Session = Depends(get_session)) -> NodeOut:
    node = session.get(Node, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return _to_out(node)