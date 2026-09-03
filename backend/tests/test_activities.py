"""Phase 8 Step 5 — controlled Activity write path + association population.

Proves: associations persist and come back through GET /api/v1/activities;
the write path is internal-only (no public POST); session lifecycle events
carry agent/session/project/research associations.
"""

from sqlmodel import Session as DbSession
from sqlmodel import SQLModel, create_engine, select

from app.models.command import Activity
from app.services import activity_service, session_service


def test_record_with_associations_returned_by_get(client) -> None:
    from app.db.database import engine

    # Write through the controlled internal path on the app database.
    with DbSession(engine) as db_session:
        created = activity_service.record(
            db_session,
            type_="test",
            action="associated",
            message="activity with links",
            project_id="p1",
            agent_id="a1",
            session_id="s1",
            research_project_id="rp1",
        )

    body = client.get("/api/v1/activities").json()
    found = next(a for a in body if a["id"] == created.id)
    assert found["project_id"] == "p1"
    assert found["agent_id"] == "a1"
    assert found["session_id"] == "s1"
    assert found["research_project_id"] == "rp1"


def test_activities_require_auth() -> None:
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as bare:
        assert bare.get("/api/v1/activities").status_code == 401


def test_no_public_activity_write_endpoint(client) -> None:
    resp = client.post(
        "/api/v1/activities",
        json={"type": "x", "action": "y", "message": "z"},
    )
    assert resp.status_code in (404, 405)  # no free-form injection path exists


def test_session_lifecycle_writes_associated_activities(tmp_path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'act.db'}")
    SQLModel.metadata.create_all(engine)
    with DbSession(engine) as db_session:
        created = session_service.create(
            db_session,
            agent_id="coding-agent",
            project_id="p1",
            research_project_id="rp1",
        )
        session_service.transition(db_session, created.id, status="completed")

        rows = db_session.exec(select(Activity)).all()
        assert len(rows) == 2
        ev = {r.action: r for r in rows}
        assert ev["created"].agent_id == "coding-agent"
        assert ev["created"].session_id == created.id
        assert ev["created"].project_id == "p1"
        assert ev["created"].research_project_id == "rp1"
        assert ev["completed"].session_id == created.id
        assert ev["completed"].research_project_id == "rp1"