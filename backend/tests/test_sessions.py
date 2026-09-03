"""Phase 8 Step 4 — Session Plane tests.

Covers: seeded list / detail / 404 / 401 auth / by-agent filtering /
idempotent seed / internal-only create + transition lifecycle.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session as DbSession
from sqlmodel import SQLModel, create_engine, select

from app.main import app
from app.models.session import SessionRecord
from app.services import session_service

# Sessions seeded from the real agents.yaml by the suite bootstrap.
SEEDED_IDS = {
    "coding-agent-session-001",
    "coding-agent-session-002",
    "research-agent-session-001",
}


def test_list_sessions_returns_seeded(client: TestClient) -> None:
    body = client.get("/api/v1/sessions").json()
    ids = {s["id"] for s in body}
    assert SEEDED_IDS <= ids
    s001 = next(s for s in body if s["id"] == "coding-agent-session-001")
    assert s001["agent_id"] == "coding-agent"
    assert s001["status"] == "completed"
    assert s001["project_id"] == "coding-video"
    assert s001["started_at"].endswith("Z")
    assert s001["last_activity_at"].endswith("Z")
    # registry seeds carry no research association
    assert s001["research_project_id"] is None


def test_session_detail(client: TestClient) -> None:
    body = client.get("/api/v1/sessions/research-agent-session-001").json()
    assert body["id"] == "research-agent-session-001"
    assert body["agent_id"] == "research-agent"
    assert body["project_id"] == "second-brain"
    assert body["ended_at"].endswith("Z")


def test_session_not_found_404(client: TestClient) -> None:
    resp = client.get("/api/v1/sessions/nope")
    assert resp.status_code == 404


def test_sessions_require_auth() -> None:
    with TestClient(app) as bare:
        assert bare.get("/api/v1/sessions").status_code == 401
        assert bare.get("/api/v1/sessions/coding-agent-session-001").status_code == 401


def test_agent_sessions_expose_research_project_id_field(client: TestClient) -> None:
    body = client.get("/api/v1/agents/coding-agent/sessions").json()
    assert body
    assert all("research_project_id" in s for s in body)


def test_seed_is_idempotent(tmp_path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'sess.db'}")
    SQLModel.metadata.create_all(engine)
    with DbSession(engine) as db_session:
        n1 = session_service.seed_from_registry(db_session)
        n2 = session_service.seed_from_registry(db_session)
    assert n1 >= len(SEEDED_IDS)
    assert n2 == 0
    with DbSession(engine) as db_session:
        rows = db_session.exec(select(SessionRecord)).all()
    assert len(rows) == n1
    assert len(rows) == len({r.id for r in rows})  # no duplicate ids


def test_create_and_transition_internal_only(tmp_path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'life.db'}")
    SQLModel.metadata.create_all(engine)
    with DbSession(engine) as db_session:
        created = session_service.create(
            db_session,
            agent_id="coding-agent",
            project_id="p1",
            research_project_id="rp1",
            status="created",
        )
        assert created.status == "created"
        assert created.research_project_id == "rp1"
        assert created.started_at.endswith("Z")
        sid = created.id

        done = session_service.transition(
            db_session, sid, status="completed", current_task="wrap-up"
        )
        assert done is not None
        assert done.status == "completed"
        assert done.ended_at is not None and done.ended_at.endswith("Z")
        assert done.current_task == "wrap-up"

        got = session_service.get(db_session, sid)
        assert got is not None and got.status == "completed"

        with pytest.raises(ValueError):
            session_service.transition(db_session, sid, status="bogus")

        assert session_service.transition(db_session, "nope", status="completed") is None


def test_list_by_agent_filters(client: TestClient) -> None:
    body = client.get("/api/v1/agents/coding-agent/sessions").json()
    assert {s["id"] for s in body} == {
        "coding-agent-session-001",
        "coding-agent-session-002",
    }