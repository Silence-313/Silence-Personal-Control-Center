"""Health Intelligence persistence model (Phase 10 Step 3).

A lightweight ``health_snapshots`` table captures a rolling health score so the
score's history (not just its live value) can be trended later. Additive only;
computed by the heartbeat loop every tick, never authored through the API.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel


class HealthSnapshot(SQLModel, table=True):
    __tablename__ = "health_snapshots"

    id: str = Field(primary_key=True)
    node_id: str = Field(index=True)
    timestamp: datetime = Field(default_factory=datetime.now, index=True)
    overall_score: float
    online: int = 0
    offline: int = 0
    error_count: int = 0