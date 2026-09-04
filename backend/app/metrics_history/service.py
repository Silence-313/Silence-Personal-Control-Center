"""Metrics history persistence service (Phase 10 Step 1).

Persistence for the realtime metrics plane: record a sample, list samples with
optional filters, and prune samples older than the retention window. Every
function is defensive — it never leaks an exception and is safe to call against
an empty database or from an async loop (the operations are short, synchronous
SQLite writes compatible with the existing heartbeat loop).
"""

import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlmodel import Session, delete, select

from app.metrics_history.models import MetricSample
from app.metrics_history.schemas import (
    DiskAverageOut,
    MetricAverageOut,
    MetricSampleOut,
    MetricsSummaryOut,
)
from app.schemas.metrics import MetricsOut

logger = logging.getLogger("silence.backend.metrics_history")

RETENTION_DAYS = 30

_SUMMARY_RANGES = {"1h": 3600, "6h": 6 * 3600, "24h": 24 * 3600, "7d": 7 * 24 * 3600}


def _now() -> datetime:
    return datetime.now()


def record_sample(session: Session, node_id: str, metrics: MetricsOut) -> MetricSample | None:
    """Persist one realtime sample. Returns the row, or ``None`` on failure."""
    try:
        sample = MetricSample(
            id=uuid4().hex[:12],
            node_id=node_id,
            timestamp=_now(),
            cpu_percent=metrics.cpu.usage_percent,
            memory_percent=metrics.memory.usage_percent,
            disk_percent=metrics.disk.usage_percent,
            network_rx=metrics.network.down_mbps,
            network_tx=metrics.network.up_mbps,
            meta={
                "load_average": metrics.cpu.load_average,
                "cores": metrics.cpu.cores,
                "uptime_seconds": metrics.uptime_seconds,
            },
        )
        session.add(sample)
        session.commit()
        session.refresh(sample)
        return sample
    except Exception:
        session.rollback()
        logger.exception("failed to record metric sample", extra={"node_id": node_id})
        return None


def list_samples(
    session: Session,
    *,
    node_id: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int | None = None,
) -> list[MetricSample]:
    """List samples ascending by timestamp (optional node/time filters)."""
    try:
        stmt = select(MetricSample).order_by(MetricSample.timestamp.asc())
        if node_id:
            stmt = stmt.where(MetricSample.node_id == node_id)
        if start:
            stmt = stmt.where(MetricSample.timestamp >= start)
        if end:
            stmt = stmt.where(MetricSample.timestamp <= end)
        if limit:
            stmt = stmt.limit(limit)
        return list(session.exec(stmt).all())
    except Exception:
        logger.exception("failed to list metric samples")
        return []


def cleanup_old_samples(session: Session, retention_days: int = RETENTION_DAYS) -> int:
    """Delete samples older than ``retention_days``. Returns deleted count."""
    cutoff = _now() - timedelta(days=retention_days)
    try:
        result = session.exec(delete(MetricSample).where(MetricSample.timestamp < cutoff))
        session.commit()
        return result.rowcount or 0
    except Exception:
        session.rollback()
        logger.exception("failed to cleanup metric samples")
        return 0


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def to_sample_out(sample: MetricSample) -> MetricSampleOut:
    return MetricSampleOut(
        id=sample.id,
        node_id=sample.node_id,
        timestamp=_iso(sample.timestamp),
        cpu_percent=sample.cpu_percent,
        memory_percent=sample.memory_percent,
        disk_percent=sample.disk_percent,
        network_rx=sample.network_rx,
        network_tx=sample.network_tx,
        metadata=sample.meta or {},
    )


def list_history(
    session: Session,
    *,
    node_id: str,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 500,
) -> list[MetricSampleOut]:
    """Query history ascending by timestamp, mapped to read models."""
    return [
        to_sample_out(s)
        for s in list_samples(session, node_id=node_id, start=start, end=end, limit=limit)
    ]


def _avg_max(values: list[float]) -> tuple[float, float]:
    if not values:
        return 0.0, 0.0
    return round(sum(values) / len(values), 1), round(max(values), 1)


def get_summary(
    session: Session,
    *,
    node_id: str,
    range_: str = "24h",
) -> MetricsSummaryOut:
    """Aggregate within a time window. Safe on empty data (no exception)."""
    seconds = _SUMMARY_RANGES.get(range_, _SUMMARY_RANGES["24h"])
    rows = list_samples(session, node_id=node_id, start=_now() - timedelta(seconds=seconds))
    cpu_avg, cpu_max = _avg_max([r.cpu_percent for r in rows])
    mem_avg, mem_max = _avg_max([r.memory_percent for r in rows])
    disk_avg, _ = _avg_max([r.disk_percent for r in rows])
    return MetricsSummaryOut(
        node_id=node_id,
        range=range_,
        samples=len(rows),
        cpu=MetricAverageOut(average=cpu_avg, maximum=cpu_max),
        memory=MetricAverageOut(average=mem_avg, maximum=mem_max),
        disk=DiskAverageOut(average=disk_avg),
    )