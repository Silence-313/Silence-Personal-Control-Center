"""Runtime State aggregation schema (Phase 8 Step 7, READ-ONLY)."""

from pydantic import BaseModel

from app.schemas.activity import ActivityOut
from app.schemas.research import RuntimeOut


class ObservedPathSummary(BaseModel):
    kind: str  # papers | datasets | experiments | reports
    entity_id: str
    label: str
    research_project_id: str | None = None
    runtime: RuntimeOut


class RuntimeStateOut(BaseModel):
    counts: dict[str, int]
    observed: dict[str, int]  # paths / exists / missing / error
    observed_paths: list[ObservedPathSummary]
    recent_activities: list[ActivityOut]
    generated_at: str  # ISO 8601