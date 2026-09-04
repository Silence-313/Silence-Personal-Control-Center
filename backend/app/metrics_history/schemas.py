"""Metrics history read-model schemas (Phase 10 Step 2)."""

from pydantic import BaseModel


class MetricSampleOut(BaseModel):
    id: str
    node_id: str
    timestamp: str  # ISO 8601
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    network_rx: float  # down, Mbps
    network_tx: float  # up, Mbps
    metadata: dict


class MetricAverageOut(BaseModel):
    average: float
    maximum: float


class DiskAverageOut(BaseModel):
    average: float


class MetricsSummaryOut(BaseModel):
    node_id: str
    range: str  # 1h | 6h | 24h | 7d
    samples: int
    cpu: MetricAverageOut
    memory: MetricAverageOut
    disk: DiskAverageOut