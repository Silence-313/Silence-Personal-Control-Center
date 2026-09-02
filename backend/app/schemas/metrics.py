from datetime import datetime

from pydantic import BaseModel


class CpuMetrics(BaseModel):
    usage_percent: float
    cores: int
    per_core: list[float] = []
    load_average: list[float] = []


class MemoryMetrics(BaseModel):
    total_bytes: int
    used_bytes: int
    available_bytes: int
    usage_percent: float


class DiskMetrics(BaseModel):
    total_bytes: int
    used_bytes: int
    available_bytes: int
    usage_percent: float


class NetworkMetrics(BaseModel):
    down_mbps: float
    up_mbps: float


class MetricsOut(BaseModel):
    cpu: CpuMetrics
    memory: MemoryMetrics
    disk: DiskMetrics
    network: NetworkMetrics
    uptime_seconds: float
    collected_at: datetime