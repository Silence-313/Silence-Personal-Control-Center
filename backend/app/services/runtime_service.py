"""Runtime State aggregation (thin READ-ONLY composition layer).

Combines Phase 5 Projects, Phase 6 Agents/Sessions, Phase 7 Research metadata
and Phase 8 filesystem observation into one coherent snapshot for the
Dashboard, plus the most recent Activity spine events. Nothing here mutates
state; observation results come from the TTL-cached observer.
"""

from datetime import datetime, timezone

from sqlmodel import Session as DbSession
from sqlmodel import func, select

from app.models.command import Activity
from app.schemas.activity import ActivityOut
from app.schemas.runtime import ObservedPathSummary, RuntimeStateOut
from app.services import (
    activity_service,
    agent_service,
    project_service,
    research_observer,
    research_service,
    session_service,
)

_PATH_FIELDS = {
    "papers": ("pdf_path", "title"),
    "datasets": ("path", "name"),
    "experiments": ("artifact_path", "name"),
    "reports": ("path", "title"),
}


def _activity_out(a: Activity) -> ActivityOut:
    return ActivityOut(
        id=a.id,
        type=a.type,
        action=a.action,
        message=a.message,
        timestamp=a.timestamp,
        node_id=a.node_id,
        command_id=a.command_id,
        project_id=a.project_id,
        agent_id=a.agent_id,
        session_id=a.session_id,
        research_project_id=a.research_project_id,
    )


def observed_paths() -> list[ObservedPathSummary]:
    """Observe every registered Paper/Dataset/Experiment/Report path (TTL-cached)."""
    registry = research_service.load_registry()
    summaries: list[ObservedPathSummary] = []
    for kind, (field_key, label_key) in _PATH_FIELDS.items():
        for entry in registry.get(kind, []):
            eid = str(entry.get("id", ""))
            if not eid:
                continue
            label = str(entry.get(label_key, eid))
            research_project_id = entry.get("research_project_id")
            runtime = research_observer.observe_path(
                (kind, eid),
                entry.get(field_key),
                label=label,
                research_project_id=research_project_id,
            )
            summaries.append(
                ObservedPathSummary(
                    kind=kind,
                    entity_id=eid,
                    label=label,
                    research_project_id=research_project_id,
                    runtime=runtime,
                )
            )
    return summaries


def runtime_state(session: DbSession) -> RuntimeStateOut:
    registry = research_service.load_registry()
    paths = observed_paths()

    exists = sum(1 for p in paths if p.runtime.exists)
    missing = sum(1 for p in paths if p.runtime.missing)
    errored = sum(1 for p in paths if p.runtime.error is not None)

    total_activities = session.exec(
        select(func.count()).select_from(Activity)
    ).one()

    recent = activity_service.recent(session, limit=10)

    return RuntimeStateOut(
        counts={
            "projects": len(project_service.list_all()),
            "agents": len(agent_service.list_agents()),
            "sessions": len(session_service.list_all(session)),
            "activities": int(total_activities),
            "research_projects": len(registry["projects"]),
            "papers": len(registry["papers"]),
            "datasets": len(registry["datasets"]),
            "experiments": len(registry["experiments"]),
            "reports": len(registry["reports"]),
            "notes": len(registry["notes"]),
        },
        observed={
            "paths": len(paths),
            "exists": exists,
            "missing": missing,
            "error": errored,
        },
        observed_paths=paths,
        recent_activities=[_activity_out(a) for a in recent],
        generated_at=datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z"),
    )