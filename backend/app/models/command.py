"""Command + Activity persistence models."""

from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class CommandStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    REJECTED = "rejected"


class Command(SQLModel, table=True):
    __tablename__ = "commands"

    id: str = Field(primary_key=True)
    node_id: str = Field(index=True)
    command: str
    target: str | None = None
    status: str = Field(default=CommandStatus.QUEUED.value)
    requested_by: str = "local-user"
    requested_at: datetime = Field(default_factory=datetime.now)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    result: str | None = None


class Activity(SQLModel, table=True):
    __tablename__ = "activities"

    id: str = Field(primary_key=True)
    type: str
    action: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.now, index=True)
    node_id: str | None = None
    command_id: str | None = None