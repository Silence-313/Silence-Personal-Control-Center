"""Health Intelligence read-model schemas (Phase 10 Step 3)."""

from pydantic import BaseModel


class NodeHealthOut(BaseModel):
    online: int = 0
    offline: int = 0


class ServiceHealthOut(BaseModel):
    docker_daemon: bool | None = None  # None = docker not probed (light summary)
    running: int = 0
    stopped: int = 0


class RecentErrorOut(BaseModel):
    id: str
    type: str
    action: str
    message: str
    timestamp: str  # ISO 8601


class HealthSummaryOut(BaseModel):
    overall_score: int
    node_health: NodeHealthOut
    service_health: ServiceHealthOut
    recent_errors: list[RecentErrorOut]