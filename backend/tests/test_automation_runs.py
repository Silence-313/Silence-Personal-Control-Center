"""Automation observability tests (Phase 10 Step 5)."""

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.automation import engine as automation_engine
from app.main import app
from app.services import sse_service


def _isolated(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'runs.db'}")
    SQLModel.metadata.create_all(engine)
    return engine


def test_evaluate_records_success_run(tmp_path, monkeypatch):
    monkeypatch.setattr(sse_service, "publish_notification", lambda data: True)
    engine = _isolated(tmp_path)
    with Session(engine) as s:
        automation_engine.evaluate(s, {"type": "node.offline", "value": "offline"})
        runs = automation_engine.list_runs(s)

    assert any(
        r.rule_id == "node-offline-alert" and r.status == "success" for r in runs
    )


def test_evaluate_records_skipped_run(tmp_path, monkeypatch):
    monkeypatch.setattr(sse_service, "publish_notification", lambda data: True)
    engine = _isolated(tmp_path)
    with Session(engine) as s:
        automation_engine.evaluate(
            s, {"type": "activity.created", "action": "created", "value": "created"}
        )
        runs = automation_engine.list_runs(s)

    assert any(
        r.rule_id == "failed-activity-alert" and r.status == "skipped" for r in runs
    )


def test_automation_runs_endpoint(client):
    resp = client.get("/api/v1/automation/runs")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_automation_runs_requires_auth():
    assert TestClient(app).get("/api/v1/automation/runs").status_code == 401