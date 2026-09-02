"""Local Mac Node Agent: identity, registry, and heartbeat.

In v0.1 the node agent runs in-process (single machine). The control plane
reads real system identity here; remote agents add a network protocol later
without changing this service's public shape.
"""

import logging
import platform as _platform
from datetime import datetime

from sqlmodel import Session

from app.core.config import settings
from app.models.node import Node, NodeCapability, NodeStatus

logger = logging.getLogger("silence.backend.node")

_LOCAL_CAPABILITIES = [c.value for c in NodeCapability]


def _now() -> datetime:
    # Naive local time — all consumers run on the same machine in v0.1.
    return datetime.now()


def _platform_name() -> str:
    return "macos" if _platform.system() == "Darwin" else _platform.system().lower()


def _os_version() -> str:
    if _platform.system() == "Darwin":
        release = _platform.mac_ver()[0]
        if release:
            return f"macOS {release}"
    return _platform.version()


def build_identity() -> dict:
    return {
        "id": settings.node_id,
        "name": settings.node_name,
        "platform": _platform_name(),
        "architecture": _platform.machine().lower(),
        "os_version": _os_version(),
        "status": NodeStatus.ONLINE.value,
        "capabilities": _LOCAL_CAPABILITIES,
    }


def register_local_node(session: Session) -> Node:
    ident = build_identity()
    node = session.get(Node, ident["id"])
    if node is None:
        node = Node(**ident, last_seen=_now())
        session.add(node)
    else:
        node.name = ident["name"]
        node.platform = ident["platform"]
        node.architecture = ident["architecture"]
        node.os_version = ident["os_version"]
        node.capabilities = ident["capabilities"]
        node.status = NodeStatus.ONLINE.value
        node.last_seen = _now()
    session.commit()
    session.refresh(node)
    logger.info("local node registered", extra={"node_id": node.id})
    return node


def heartbeat(session: Session) -> None:
    node = session.get(Node, settings.node_id)
    if node is None:
        register_local_node(session)
        return
    node.status = NodeStatus.ONLINE.value
    node.last_seen = _now()
    session.commit()
    logger.debug("node heartbeat", extra={"node_id": node.id})


_STALE_FACTOR = 3.0


def computed_status(last_seen: datetime) -> str:
    """Online while last_seen is within 3× the heartbeat interval."""
    stale = (_now() - last_seen).total_seconds()
    threshold = settings.heartbeat_interval_seconds * _STALE_FACTOR
    return NodeStatus.OFFLINE.value if stale > threshold else NodeStatus.ONLINE.value