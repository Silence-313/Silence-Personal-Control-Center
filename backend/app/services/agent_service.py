"""Agent registry + read-model service (no agent runtime, no process spawn).

The registry lives in ``config/agents.yaml`` (same pattern as the project
registry): identity, metadata, capabilities and association only. Nothing here
reads an external agent runtime or starts a process.
"""

import logging
from pathlib import Path

import yaml

from app.core.config import settings
from app.schemas.agent import AgentOut

logger = logging.getLogger("silence.backend.agent")


class AgentRegistryError(RuntimeError):
    pass


def load_registry() -> dict:
    """Return ``{"agents": [...], "sessions": [...]}``.

    A missing file is treated as an empty registry (logged clearly); a file
    that fails to parse raises :class:`AgentRegistryError`.
    """
    path = Path(settings.agents_config)
    if not path.exists():
        logger.warning("agent registry not found", extra={"path": str(path)})
        return {"agents": [], "sessions": []}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        logger.exception("failed to parse agent registry", extra={"path": str(path)})
        raise AgentRegistryError("agent registry is not valid YAML") from exc
    return {
        "agents": data.get("agents") or [],
        "sessions": data.get("sessions") or [],
    }


def build_agent(entry: dict) -> AgentOut:
    agent_id = str(entry.get("id", ""))
    return AgentOut(
        id=agent_id,
        name=str(entry.get("name", agent_id)),
        type=str(entry.get("type", "general")),
        description=str(entry.get("description", "")),
        status=str(entry.get("status", "unknown")),
        node_id=str(entry.get("node_id") or settings.node_id),
        current_project_id=entry.get("current_project_id"),
        current_session_id=entry.get("current_session_id"),
        current_task=entry.get("current_task"),
        last_activity_at=entry.get("last_activity_at"),
        capabilities=[str(c) for c in (entry.get("capabilities") or [])],
        metadata=entry.get("metadata") or {},
    )


def list_agents() -> list[AgentOut]:
    return [build_agent(entry) for entry in load_registry()["agents"]]


def get_agent(agent_id: str) -> AgentOut | None:
    for entry in load_registry()["agents"]:
        if str(entry.get("id", "")) == agent_id:
            return build_agent(entry)
    return None