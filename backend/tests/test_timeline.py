"""Event Timeline tests (Phase 10 Step 4)."""

from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.main import app
from app.models.command import Activity
from app.services import activity_service


def _isolated(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'tl.db'}")
    SQLModel.metadata.create_all(engine)
    return engine


def test_record_derives_severity_and_category(tmp_path):
    engine = _isolated(tmp_path)
    with Session(engine) as s:
        ok = activity_service.record(s, type_="node", action="running", message="m")
        err = activity_service.record(s, type_="command", action="deploy failed", message="m")
        warn = activity_service.record(s, type_="node", action="heartbeat timeout", message="m")

        assert ok.severity == "info" and ok.category == "node"
        assert err.severity == "error" and err.category == "command"
        assert warn.severity == "warning" and warn.category == "node"


def test_query_timeline_filters_and_order(tmp_path):
    engine = _isolated(tmp_path)
    t0 = datetime(2026, 1, 1, 10, 0, 0)
    with Session(engine) as s:
        s.add(
            Activity(id="a1", type="node", action="up", message="m",
                     timestamp=t0, severity="info", category="node")
        )
        s.add(
            Activity(id="a2", type="command", action="failed", message="m",
                     timestamp=t0 + timedelta(minutes=1), severity="error", category="command")
        )
        s.add(
            Activity(id="a3", type="node", action="timeout", message="m",
                     timestamp=t0 + timedelta(minutes=2), severity="warning", category="node")
        )
        s.commit()

        # Newest first.
        all_rows = activity_service.query_timeline(s)
        assert [r.id for r in all_rows] == ["a3", "a2", "a1"]

        # severity / category / source filters.
        assert [r.id for r in activity_service.query_timeline(s, severity="error")] == ["a2"]
        assert [r.id for r in activity_service.query_timeline(s, category="node")] == ["a3", "a1"]
        assert [r.id for r in activity_service.query_timeline(s, source="command")] == ["a2"]

        # time window filters.
        start = t0 + timedelta(minutes=1)
        end = t0 + timedelta(minutes=1)
        assert [r.id for r in activity_service.query_timeline(s, start=start, end=end)] == ["a2"]


def test_timeline_endpoint(client):
    from app.db.database import engine

    with Session(engine) as s:
        activity_service.record(s, type_="tl-unique", action="ran", message="m")

    resp = client.get("/api/v1/events/timeline", params={"source": "tl-unique"})
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert body and all(e["type"] == "tl-unique" for e in body)
    assert {e["severity"] for e in body} == {"info"}


def test_timeline_requires_auth():
    assert TestClient(app).get("/api/v1/events/timeline").status_code == 401