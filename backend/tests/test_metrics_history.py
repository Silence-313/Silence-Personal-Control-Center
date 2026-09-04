"""Metrics history persistence tests (Phase 10 Step 1)."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.db.database import engine
from app.main import app
from app.metrics_history import service as metrics_history_service
from app.metrics_history.models import MetricSample
from app.schemas.metrics import (
    CpuMetrics,
    DiskMetrics,
    MemoryMetrics,
    MetricsOut,
    NetworkMetrics,
)


def _metrics() -> MetricsOut:
    return MetricsOut(
        cpu=CpuMetrics(
            usage_percent=42.0,
            cores=8,
            per_core=[40.0, 44.0],
            load_average=[1.0, 0.8, 0.6],
        ),
        memory=MemoryMetrics(
            total_bytes=16_000_000_000,
            used_bytes=8_000_000_000,
            available_bytes=8_000_000_000,
            usage_percent=50.0,
        ),
        disk=DiskMetrics(
            total_bytes=1_000_000_000_000,
            used_bytes=500_000_000_000,
            available_bytes=500_000_000_000,
            usage_percent=50.0,
        ),
        network=NetworkMetrics(down_mbps=10.0, up_mbps=5.0),
        uptime_seconds=12345.0,
        collected_at=datetime.now(),
    )


@pytest.fixture(autouse=True)
def _clear_samples():
    """Isolate each test: start from an empty metrics_samples table."""
    with Session(engine) as session:
        session.exec(delete(MetricSample))
        session.commit()
    yield


def test_create_sample():
    with Session(engine) as session:
        sample = metrics_history_service.record_sample(session, "test-node", _metrics())
        assert sample is not None
        assert sample.node_id == "test-node"
        assert sample.cpu_percent == 42.0
        assert sample.memory_percent == 50.0
        assert sample.disk_percent == 50.0
        assert sample.network_rx == 10.0
        assert sample.network_tx == 5.0
        assert sample.meta["cores"] == 8
        assert sample.meta["load_average"] == [1.0, 0.8, 0.6]


def test_list_samples_in_ascending_order_with_filters():
    with Session(engine) as session:
        metrics_history_service.record_sample(session, "n1", _metrics())
        metrics_history_service.record_sample(session, "n2", _metrics())

        samples = metrics_history_service.list_samples(session)
        assert len(samples) == 2
        assert samples[0].timestamp <= samples[1].timestamp

        assert len(metrics_history_service.list_samples(session, node_id="n1")) == 1
        assert len(metrics_history_service.list_samples(session, limit=1)) == 1


def test_empty_database_returns_empty_list():
    with Session(engine) as session:
        assert metrics_history_service.list_samples(session) == []
        assert metrics_history_service.cleanup_old_samples(session) == 0


def test_cleanup_old_samples():
    old = datetime.now() - timedelta(days=60)
    with Session(engine) as session:
        session.add(
            MetricSample(
                id="old-1",
                node_id="n",
                timestamp=old,
                cpu_percent=1.0,
                memory_percent=1.0,
                disk_percent=1.0,
                network_rx=0.0,
                network_tx=0.0,
                meta={},
            )
        )
        session.commit()

        metrics_history_service.record_sample(session, "n", _metrics())

        removed = metrics_history_service.cleanup_old_samples(session, retention_days=30)
        assert removed == 1

        samples = metrics_history_service.list_samples(session)
        assert [s.id for s in samples] != ["old-1"]
        assert all(s.id != "old-1" for s in samples)
        assert len(samples) == 1


def test_authentication_unaffected():
    # Anonymous access to a protected endpoint is still rejected.
    assert TestClient(app).get("/api/v1/activities").status_code == 401


def test_authorized_access_still_works(client):
    assert client.get("/api/v1/activities").status_code == 200