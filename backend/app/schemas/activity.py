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
    # Association contract (Phase 6/8). Persisted as nullable columns via the
    # idempotent migration (app.db.migrations); old rows and rows written
    # before associations existed read back as None. Values are populated by
    # internal system producers (Phase 8 Step 5), never free-form input.
    project_id: str | None = None
    agent_id: str | None = None
    session_id: str | None = None
    research_project_id: str | None = None