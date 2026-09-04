"""Context aggregation API tests (entity + relations + related planes)."""

from fastapi.testclient import TestClient


def test_context_project(client: TestClient) -> None:
    resp = client.get("/api/v1/context/project/second-brain")
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "project"
    assert body["id"] == "second-brain"
    assert body["entity"]["id"] == "second-brain"

    agent_ids = {a["id"] for a in body["agents"]}
    assert "research-agent" in agent_ids
    assert "data-agent" in agent_ids

    session_ids = {s["id"] for s in body["sessions"]}
    assert "research-agent-session-001" in session_ids

    rp_ids = {p["id"] for p in body["research_projects"]}
    assert "research-knowledge" in rp_ids

    assert body["relations"]


def test_context_agent(client: TestClient) -> None:
    resp = client.get("/api/v1/context/agent/research-agent")
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "agent"
    assert body["entity"]["id"] == "research-agent"
    project_ids = {p["id"] for p in body["projects"]}
    assert "second-brain" in project_ids


def test_context_research_children(client: TestClient) -> None:
    resp = client.get("/api/v1/context/research/research-g1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["entity"]["id"] == "research-g1"
    assert len(body["papers"]) > 0
    assert len(body["datasets"]) > 0
    assert len(body["experiments"]) > 0
    assert len(body["reports"]) > 0
    assert len(body["notes"]) > 0


def test_context_paper_relation(client: TestClient) -> None:
    resp = client.get("/api/v1/context/paper/paper-gvhmr")
    assert resp.status_code == 200
    body = resp.json()
    assert body["entity"]["id"] == "paper-gvhmr"
    assert any(
        r["relation_type"] == "belongs_to" and r["target_id"] == "research:research-gvhmr"
        for r in body["relations"]
    )


def test_context_not_found(client: TestClient) -> None:
    assert client.get("/api/v1/context/project/does-not-exist").status_code == 404


def test_context_unknown_type(client: TestClient) -> None:
    assert client.get("/api/v1/context/foo/bar").status_code == 404


def test_context_provider(client: TestClient) -> None:
    resp = client.get("/api/v1/context/provider/research-agent")
    assert resp.status_code == 200
    body = resp.json()
    assert body["agent"]["id"] == "research-agent"
    assert body["current_project"]["id"] == "second-brain"
    assert isinstance(body["recent_activities"], list)
    assert isinstance(body["recent_failures"], list)


def test_context_provider_not_found(client: TestClient) -> None:
    assert client.get("/api/v1/context/provider/nope").status_code == 404