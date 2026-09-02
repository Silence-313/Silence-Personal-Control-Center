from datetime import datetime

from pydantic import BaseModel


class ActivityOut(BaseModel):
    id: str
    type: str
    action: str
    message: str
    timestamp: datetime
    node_id: str | None = None
    command_id: str | None = None