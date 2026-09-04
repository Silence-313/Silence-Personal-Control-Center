from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "display_on" in body  # bool — drives the iPad's sleeping/awake state


def test_api_v1_health(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert "node_agent" in body
    assert "docker" in body


def test_openapi_schema_present(client: TestClient) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/health" in paths
    assert "/api/v1/health" in paths


def test_unhandled_route_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404


# --- Phase 10 Step 3 — Health Intelligence ----------------------------------

from datetime import datetime, timedelta  # noqa: E402

from sqlmodel import SQLModel, Session, create_engine, select  # noqa: E402

from app.health import service as health_service  # noqa: E402
from app.health.models import HealthSnapshot  # noqa: E402
from app.main import app  # noqa: E402
from app.models.command import Activity  # noqa: E402
from app.models.node import Node  # noqa: E402


def _isolated_health(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'health.db'}")
    SQLModel.metadata.create_all(engine)
    return engine


def test_health_summary_endpoint_shape(client):
    resp = client.get("/api/v1/health/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert 0 <= body["overall_score"] <= 100
    assert set(body["node_health"]) == {"online", "offline"}
    assert isinstance(body["service_health"], dict)
    assert isinstance(body["recent_errors"], list)


def test_health_summary_requires_auth():
    assert TestClient(app).get("/api/v1/health/summary").status_code == 401


def test_compute_summary_score(tmp_path):
    engine = _isolated_health(tmp_path)
    with Session(engine) as s:
        s.add(
            Node(
                id="online", name="Online", platform="t", architecture="a",
                os_version="v", status="online", capabilities=[],
                last_seen=datetime.now(),
            )
        )
        s.add(
            Node(
                id="offline", name="Offline", platform="t", architecture="a",
                os_version="v", status="online", capabilities=[],
                last_seen=datetime.now() - timedelta(minutes=60),
            )
        )
        s.add(
            Activity(
                id="e1", type="system", action="backup failed", message="x",
                severity="error", category="system",
            )
        )
        s.add(
            Activity(
                id="e2", type="command", action="sync error", message="x",
                severity="error", category="command",
            )
        )
        s.commit()

        summary = health_service.compute_summary(s, include_services=False)

    assert summary.node_health.online == 1
    assert summary.node_health.offline == 1
    assert len(summary.recent_errors) == 2
    assert summary.overall_score == 100 - 30 - 10  # offline -30, 2 errors -10
    assert summary.service_health.docker_daemon is None  # light summary


def test_record_snapshot(tmp_path):
    engine = _isolated_health(tmp_path)
    with Session(engine) as s:
        s.add(
            Node(
                id="n", name="n", platform="t", architecture="a",
                os_version="v", status="online", capabilities=[],
                last_seen=datetime.now(),
            )
        )
        s.commit()
        snap = health_service.record_snapshot(s)
        assert snap is not None
        assert snap.overall_score == 100
        assert snap.online == 1
        assert snap.error_count == 0

    with Session(engine) as s:
        assert len(s.exec(select(HealthSnapshot)).all()) == 1