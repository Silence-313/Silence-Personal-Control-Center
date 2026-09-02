"""Node registry model + capability/status enums."""

from datetime import datetime
from enum import Enum

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class NodeCapability(str, Enum):
    """Allowlisted capabilities a node exposes (read-only + sleep only in v0.1)."""

    SYSTEM_METRICS = "system_metrics"
    DOCKER_READ = "docker_read"
    GIT_READ = "git_read"
    POWER_READ = "power_read"
    POWER_SLEEP = "power_sleep"


class NodeStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"


class Node(SQLModel, table=True):
    __tablename__ = "nodes"

    id: str = Field(primary_key=True)
    name: str
    platform: str
    architecture: str
    os_version: str = ""
    status: str = Field(default=NodeStatus.ONLINE.value)
    capabilities: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    last_seen: datetime = Field(default_factory=datetime.now)