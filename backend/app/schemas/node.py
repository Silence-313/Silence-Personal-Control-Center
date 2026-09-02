from datetime import datetime

from pydantic import BaseModel


class NodeHardwareOut(BaseModel):
    chip: str
    cpu_cores: int
    performance_cores: int
    efficiency_cores: int
    memory_gb: int
    gpu: str


class NodeOut(BaseModel):
    id: str
    name: str
    platform: str
    architecture: str
    os_version: str
    status: str
    capabilities: list[str]
    last_seen: datetime
    model: str | None = None
    ip: str | None = None
    uptime_seconds: float | None = None
    hardware: NodeHardwareOut | None = None