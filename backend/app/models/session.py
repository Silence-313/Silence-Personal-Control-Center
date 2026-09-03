"""Session Plane persistence model (SQLite).

Sessions are seeded idempotently from the agents.yaml registry (once, when the
table is empty) and then live in SQLite as a queryable read/lifecycle plane.
All timestamps are stored as naive UTC datetimes; the service layer converts
to/from ISO 8601 "Z" strings for the API.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel


class SessionRecord(SQLModel, table=True):
    __tablename__ = "sessions"

    id: str = Field(primary_key=True)
    agent_id: str = Field(index=True)
    node_id: str
    project_id: str | None = None
    research_project_id: str | None = None
    status: str
    started_at: datetime
    ended_at: datetime | None = None
    last_activity_at: datetime
    current_task: str | None = None