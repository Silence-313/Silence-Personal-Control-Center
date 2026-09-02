from datetime import datetime

from pydantic import BaseModel


class CommandRequest(BaseModel):
    node_id: str
    command: str
    target: str | None = None


class CommandOut(BaseModel):
    id: str
    node_id: str
    command: str
    status: str
    requested_at: datetime
    result: str | None = None