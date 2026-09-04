"""Metrics history API tests (Phase 10 Step 2)."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.db.database import engine
from app.main import app
from app.metrics_history.models import MetricSample

NODE = "macbook-pro"
BASE = datetime.now() - timedelta(hours=1)


def _seed(session: Session, points: list[tuple[datetime, dict]]) -> None:
    for i, (ts, vals) in enumerate(points):
        session.add(
            MetricSample(
                id=f"s{i}",
                node_id=NODE,
                timestamp=ts,
                cpu_percent=vals["cpu"],
                memory_percent=vals["mem"],
                disk_percent=vals.get("disk", 10.0),
                network_rx=vals.get("rx", 0.0),
                network_tx=vals.get("tx", 0.0),
                meta={},
            )
        )
    session.commit()


@pytest.fixture(autouse=True)
def _clear_samples():
    with Session(engine) as session:
        session.exec(delete(MetricSample))
        session.commit()
    yield


# --- History API ---


def test_history_normal_query_ascending(client):
    with Session(engine) as session:
        _seed(
            session,
            [
                (BASE - timedelta(minutes=2), {"cpu": 10.0, "mem": 50.0}),
                (BASE - timedelta(minutes=1), {"cpu": 20.0, "mem": 60.0}),
                (BASE, {"cpu": 30.0, "mem": 70.0}),
            ],
        )

    resp = client.get("/api/v1/metrics/history", params={"node_id": NODE})
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert len(body) == 3
    timestamps = [s["timestamp"] for s in body]
    assert timestamps == sorted(timestamps)  # ascending
    assert body[0]["cpu_percent"] == 10.0
    assert body[-1]["cpu_percent"] == 30.0
    assert body[0]["metadata"] == {}


def test_history_time_filter(client):
    with Session(engine) as session:
        _seed(
            session,
            [
                (BASE - timedelta(hours=2), {"cpu": 1.0, "mem": 1.0}),
                (BASE - timedelta(minutes=30), {"cpu": 2.0, "mem": 2.0}),
                (BASE, {"cpu": 3.0, "mem": 3.0}),
            ],
        )

    start = (BASE - timedelta(hours=1)).isoformat()
    resp = client.get(
        "/api/v1/metrics/history", params={"node_id": NODE, "start": start}
    )
    assert resp.status_code == 200
    cpus = [s["cpu_percent"] for s in resp.json()]
    assert cpus == [2.0, 3.0]  # only the in-window samples

    end = (BASE - timedelta(minutes=15)).isoformat()
    resp = client.get(
        "/api/v1/metrics/history",
        params={"node_id": NODE, "start": start, "end": end},
    )
    cpus = [s["cpu_percent"] for s in resp.json()]
    assert cpus == [2.0]


def test_history_limit(client):
    with Session(engine) as session:
        _seed(session, [(BASE + timedelta(minutes=i), {"cpu": float(i), "mem": 50.0}) for i in range(5)])

    resp = client.get("/api/v1/metrics/history", params={"node_id": NODE, "limit": 2})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_history_empty_result(client):
    resp = client.get("/api/v1/metrics/history", params={"node_id": NODE})
    assert resp.status_code == 200
    assert resp.json() == []


def test_history_node_not_found_404(client):
    resp = client.get("/api/v1/metrics/history", params={"node_id": "missing"})
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


# --- Summary API ---


def test_summary_average_and_maximum(client):
    with Session(engine) as session:
        _seed(
            session,
            [
                (BASE - timedelta(minutes=2), {"cpu": 10.0, "mem": 50.0, "disk": 40.0}),
                (BASE - timedelta(minutes=1), {"cpu": 20.0, "mem": 60.0, "disk": 40.0}),
                (BASE, {"cpu": 30.0, "mem": 70.0, "disk": 40.0}),
            ],
        )

    resp = client.get("/api/v1/metrics/summary", params={"node_id": NODE, "range": "24h"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["node_id"] == NODE
    assert body["range"] == "24h"
    assert body["samples"] == 3
    assert body["cpu"]["average"] == 20.0
    assert body["cpu"]["maximum"] == 30.0
    assert body["memory"]["average"] == 60.0
    assert body["memory"]["maximum"] == 70.0
    assert body["disk"]["average"] == 40.0
    assert "maximum" not in body["disk"]


def test_summary_empty_data(client):
    resp = client.get("/api/v1/metrics/summary", params={"node_id": NODE})
    assert resp.status_code == 200
    body = resp.json()
    assert body["samples"] == 0
    assert body["cpu"]["average"] == 0.0
    assert body["cpu"]["maximum"] == 0.0
    assert body["memory"]["average"] == 0.0
    assert body["disk"]["average"] == 0.0


# --- Authentication ---


def test_history_requires_auth_401():
    assert TestClient(app).get("/api/v1/metrics/history", params={"node_id": NODE}).status_code == 401


def test_history_authorized_200(client):
    assert client.get("/api/v1/metrics/history", params={"node_id": NODE}).status_code == 200
    assert client.get("/api/v1/metrics/summary", params={"node_id": NODE}).status_code == 200