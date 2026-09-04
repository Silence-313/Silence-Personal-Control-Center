"""Unified Context aggregation (READ-ONLY composition layer, Phase 9).

Given an entity (type, id), assembles everything relevant to it — the entity
itself, its relation graph edges, connected projects/agents/sessions, related
research, and recent activities — by reusing the existing plane services and the
Phase 9 knowledge relation graph. Nothing here mutates state.
"""

import logging
from datetime import datetime, timezone

from sqlmodel import Session as DbSession

from app.knowledge import service as knowledge_service
from app.knowledge.models import KNOWLEDGE_TYPES
from app.schemas.activity import ActivityOut
from app.schemas.context import AgentContextProviderOut, ContextOut
from app.services import (
    activity_service,
    agent_service,
    project_service,
    research_service,
    session_service,
)

logger = logging.getLogger("silence.backend.context")

_CHILD_TYPES = {"paper", "dataset", "experiment", "report", "note"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _resolve(type_: str, session: DbSession, entity_id: str) -> dict | None:
    """Resolve an entity id via its plane service → JSON-safe dict (or None)."""
    if type_ == "project":
        item = project_service.get_project(entity_id)
    elif type_ == "agent":
        item = agent_service.get_agent(entity_id)
    elif type_ == "research":
        item = research_service.get_project(entity_id)
    elif type_ == "paper":
        item = research_service.get_paper(entity_id)
    elif type_ == "dataset":
        item = research_service.get_dataset(entity_id)
    elif type_ == "experiment":
        item = research_service.get_experiment(entity_id)
    elif type_ == "report":
        item = research_service.get_report(entity_id)
    elif type_ == "note":
        item = research_service.get_note(entity_id)
    elif type_ == "session":
        item = session_service.get(session, entity_id)
    elif type_ == "activity":
        activity = activity_service.get(session, entity_id)
        return activity_service.to_out(activity).model_dump(mode="json") if activity else None
    else:
        return None
    return item.model_dump(mode="json") if item else None


def _own_associations(
    session: DbSession, type_: str, entity_id: str, entity: dict
) -> tuple[set[str], set[str], set[str], set[str]]:
    """Scoped ids derived from the entity's OWN association fields."""
    rp: set[str] = set()
    projects: set[str] = set()
    agents: set[str] = set()
    sessions: set[str] = set()

    if type_ == "project":
        projects.add(entity_id)
        for r in research_service.list_projects():
            if r.project_id == entity_id:
                rp.add(r.id)
        for a in agent_service.list_agents():
            if a.current_project_id == entity_id:
                agents.add(a.id)
        for s in session_service.list_all(session):
            if s.project_id == entity_id:
                sessions.add(s.id)
    elif type_ == "agent":
        agents.add(entity_id)
        if entity.get("current_project_id"):
            projects.add(str(entity["current_project_id"]))
            for r in research_service.list_projects():
                if r.project_id == entity["current_project_id"]:
                    rp.add(r.id)
        for s in session_service.list_all(session):
            if s.agent_id == entity_id:
                sessions.add(s.id)
    elif type_ == "research":
        rp.add(entity_id)
        if entity.get("project_id"):
            projects.add(str(entity["project_id"]))
    elif type_ in _CHILD_TYPES:
        if entity.get("research_project_id"):
            rp.add(str(entity["research_project_id"]))
    elif type_ == "session":
        sessions.add(entity_id)
        if entity.get("agent_id"):
            agents.add(str(entity["agent_id"]))
        if entity.get("project_id"):
            projects.add(str(entity["project_id"]))
        if entity.get("research_project_id"):
            rp.add(str(entity["research_project_id"]))
    elif type_ == "activity":
        if entity.get("agent_id"):
            agents.add(str(entity["agent_id"]))
        if entity.get("project_id"):
            projects.add(str(entity["project_id"]))
        if entity.get("session_id"):
            sessions.add(str(entity["session_id"]))
        if entity.get("research_project_id"):
            rp.add(str(entity["research_project_id"]))

    return rp, projects, agents, sessions


def _activities_for(
    session: DbSession, type_: str, entity_id: str, rp_ids: set[str]
) -> list[ActivityOut]:
    out: list[ActivityOut] = []
    for a in activity_service.recent(session, limit=200):
        if type_ == "project" and a.project_id == entity_id:
            out.append(activity_service.to_out(a))
        elif type_ == "agent" and a.agent_id == entity_id:
            out.append(activity_service.to_out(a))
        elif type_ == "session" and a.session_id == entity_id:
            out.append(activity_service.to_out(a))
        elif type_ == "research" and a.research_project_id == entity_id:
            out.append(activity_service.to_out(a))
        elif type_ in _CHILD_TYPES and a.research_project_id in rp_ids:
            out.append(activity_service.to_out(a))
    return out


def get_context(session: DbSession, type_: str, entity_id: str) -> ContextOut | None:
    if type_ not in KNOWLEDGE_TYPES:
        return None
    entity = _resolve(type_, session, entity_id)
    if entity is None:
        return None

    ns = knowledge_service.nsid(type_, entity_id)
    relations = knowledge_service.relations_for(session, ns)

    rp, projects, agents, sessions = _own_associations(session, type_, entity_id, entity)

    # Expand scope with relation-graph neighbours (both directions).
    for r in relations:
        for end in (r.source_id, r.target_id):
            if end == ns:
                continue
            ot, oid = knowledge_service.un_ns(end)
            if ot == "research":
                rp.add(oid)
            elif ot == "project":
                projects.add(oid)
            elif ot == "agent":
                agents.add(oid)
            elif ot == "session":
                sessions.add(oid)

    projects_out = [p for p in (project_service.get_project(i) for i in sorted(projects)) if p]
    agents_out = [a for a in (agent_service.get_agent(i) for i in sorted(agents)) if a]
    sessions_out = [s for s in (session_service.get(session, i) for i in sorted(sessions)) if s]

    research_projects = [r for r in research_service.list_projects() if r.id in rp]
    papers = [p for p in research_service.list_papers() if p.research_project_id in rp]
    datasets = [d for d in research_service.list_datasets() if d.research_project_id in rp]
    experiments = [e for e in research_service.list_experiments() if e.research_project_id in rp]
    reports = [r for r in research_service.list_reports() if r.research_project_id in rp]
    notes = [n for n in research_service.list_notes() if n.research_project_id in rp]

    return ContextOut(
        type=type_,
        id=entity_id,
        entity=entity,
        relations=relations,
        projects=projects_out,
        agents=agents_out,
        sessions=sessions_out,
        research_projects=research_projects,
        papers=papers,
        datasets=datasets,
        experiments=experiments,
        reports=reports,
        notes=notes,
        activities=_activities_for(session, type_, entity_id, rp),
        generated_at=_now_iso(),
    )


def provider(session: DbSession, agent_id: str) -> AgentContextProviderOut | None:
    """Agent Context Provider: a curated bundle for an agent/AI consumer."""
    agent = agent_service.get_agent(agent_id)
    if agent is None:
        return None
    ctx = get_context(session, "agent", agent_id)
    if ctx is None:
        return None

    failures = [a for a in ctx.activities if a.action in {"failed", "error"}]
    return AgentContextProviderOut(
        agent=agent,
        current_project=ctx.projects[0] if ctx.projects else None,
        projects=ctx.projects,
        research_projects=ctx.research_projects,
        experiments=ctx.experiments,
        notes=ctx.notes,
        sessions=ctx.sessions,
        recent_activities=ctx.activities[:20],
        recent_failures=failures[:10],
        generated_at=ctx.generated_at,
    )