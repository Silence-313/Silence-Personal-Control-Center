"""Agent + AgentSession read-model schemas (control-plane only, no execution).

Time fields are ISO 8601 strings (machine-parsable), never human prose.
"""

from pydantic import BaseModel


class AgentOut(BaseModel):
    id: str
    name: str
    type: str  # coding | research | robotics | data | review | general
    description: str
    status: str  # offline | idle | running | error | unknown
    node_id: str
    current_project_id: str | None = None
    current_session_id: str | None = None
    current_task: str | None = None
    last_activity_at: str | None = None  # ISO 8601
    capabilities: list[str] = []
    metadata: dict = {}


class AgentSessionOut(BaseModel):
    id: str
    agent_id: str
    node_id: str
    project_id: str | None = None
    # Phase 8 add-only: links the Session Plane to a Research Project (Phase 7).
    # Null for registry-seeded sessions that carry no research association.
    research_project_id: str | None = None
    status: str  # created | running | completed | failed | cancelled
    started_at: str  # ISO 8601
    ended_at: str | None = None
    last_activity_at: str  # ISO 8601
    current_task: str | None = None