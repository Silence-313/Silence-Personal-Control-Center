from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import config
from app.main import app
from app.services import agent_service
from app.services.agent_service import AgentRegistryError

REGISTRY = """\
agents:
  - id: coding-agent
    name: Coding Agent
    type: coding
    description: Coding task orchestration
    status: idle
    node_id: macbook-pro
    current_project_id: coding-video
    capabilities: [code_analysis, code_generation, testing]
    metadata: {}

  - id: research-agent
    name: Research Agent
    type: research
    description: Research assistance
    status: idle
    node_id: macbook-pro
    capabilities: [paper_analysis]
    metadata: {}

sessions:
  - id: s1
    agent_id: coding-agent
    node_id: macbook-pro
    project_id: coding-video
    status: completed
    started_at: "2026-09-03T08:00:00Z"
    ended_at: "2026-09-03T08:30:00Z"
    last_activity_at: "2026-09-03T08:30:00Z"

  - id: s2
    agent_id: coding-agent
    node_id: macbook-pro
    status: failed
    started_at: "2026-09-04T10:00:00Z"
    ended_at: "2026-09-04T10:12:00Z"
    last_activity_at: "2026-09-04T10:12:00Z"
"""


def _use_registry(tmp_path: Path, monkeypatch, content: str = REGISTRY) -> None:
    path = tmp_path / "agents.yaml"
    path.write_text(content, encoding="utf-8")
    monkeypatch.setattr(config.settings, "agents_config", str(path))


def test_agents_empty_by_default(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch, "agents: []\nsessions: []\n")
    assert client.get("/api/v1/agents").json() == []


def test_agents_from_registry(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch)
    body = client.get("/api/v1/agents").json()
    assert len(body) == 2
    assert body[0]["id"] == "coding-agent"
    assert body[0]["type"] == "coding"
    assert body[0]["status"] == "idle"
    assert body[0]["node_id"] == "macbook-pro"
    assert body[0]["capabilities"] == ["code_analysis", "code_generation", "testing"]
    assert body[0]["current_project_id"] == "coding-video"


def test_agent_detail(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch)
    body = client.get("/api/v1/agents/coding-agent").json()
    assert body["name"] == "Coding Agent"
    assert body["description"] == "Coding task orchestration"


def test_agent_not_found_404(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch)
    assert client.get("/api/v1/agents/nope").status_code == 404
    assert client.get("/api/v1/agents/nope/sessions").status_code == 404


def test_agent_sessions_read_from_session_plane(client: TestClient) -> None:
    """Phase 8: sessions live in the SQLite Session Plane (seeded once from
    the real agents.yaml), not in the per-test YAML registry. Response shape
    is unchanged (add-only research_project_id)."""
    body = client.get("/api/v1/agents/coding-agent/sessions").json()
    assert {s["id"] for s in body} == {
        "coding-agent-session-001",
        "coding-agent-session-002",
    }
    assert {s["status"] for s in body} == {"completed", "failed"}
    assert all("research_project_id" in s for s in body)


def test_agent_sessions_empty(client: TestClient) -> None:
    # robotics-agent exists in the real registry but has no seeded sessions.
    assert client.get("/api/v1/agents/robotics-agent/sessions").json() == []


def test_agents_require_auth() -> None:
    with TestClient(app) as bare:
        assert bare.get("/api/v1/agents").status_code == 401
        assert bare.get("/api/v1/agents/coding-agent").status_code == 401
        assert bare.get("/api/v1/agents/coding-agent/sessions").status_code == 401


def test_registry_bad_yaml_raises(monkeypatch, tmp_path: Path) -> None:
    path = tmp_path / "agents.yaml"
    path.write_text("agents: [unclosed\n", encoding="utf-8")
    monkeypatch.setattr(config.settings, "agents_config", str(path))
    with pytest.raises(AgentRegistryError):
        agent_service.list_agents()