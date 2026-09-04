"""Context aggregation schemas (metadata only, READ-ONLY)."""

from pydantic import BaseModel

from app.schemas.activity import ActivityOut
from app.schemas.agent import AgentOut, AgentSessionOut
from app.schemas.knowledge import RelationOut
from app.schemas.project import ProjectOut
from app.schemas.research import (
    DatasetOut,
    ExperimentOut,
    PaperOut,
    ResearchNoteOut,
    ResearchProjectOut,
    ResearchReportOut,
)


class ContextOut(BaseModel):
    type: str
    id: str
    entity: dict  # serialized entity read model ({type}-specific Out)
    relations: list[RelationOut] = []
    projects: list[ProjectOut] = []
    agents: list[AgentOut] = []
    sessions: list[AgentSessionOut] = []
    research_projects: list[ResearchProjectOut] = []
    papers: list[PaperOut] = []
    datasets: list[DatasetOut] = []
    experiments: list[ExperimentOut] = []
    reports: list[ResearchReportOut] = []
    notes: list[ResearchNoteOut] = []
    activities: list[ActivityOut] = []
    generated_at: str  # ISO 8601


class AgentContextProviderOut(BaseModel):
    agent: AgentOut
    current_project: ProjectOut | None = None
    projects: list[ProjectOut] = []
    research_projects: list[ResearchProjectOut] = []
    experiments: list[ExperimentOut] = []
    notes: list[ResearchNoteOut] = []
    sessions: list[AgentSessionOut] = []
    recent_activities: list[ActivityOut] = []
    recent_failures: list[ActivityOut] = []
    generated_at: str  # ISO 8601