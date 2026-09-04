"""Metrics history persistence model (Phase 10 Step 1).

Records a durable sample of the realtime metrics collected by
``metrics_service.collect`` so history can be queried and trended later.
Additive only: a new table, no changes to the realtime metrics response.
"""

from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class MetricSample(SQLModel, table=True):
    __tablename__ = "metrics_samples"

    id: str = Field(primary_key=True)
    node_id: str = Field(index=True)
    timestamp: datetime = Field(default_factory=datetime.now, index=True)
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    network_rx: float  # down, Mbps
    network_tx: float  # up, Mbps
    # SQLAlchemy reserves the attribute name `metadata`, so the Python field is
    # `meta` while the stored column keeps the desired "metadata" name (same
    # pattern as Phase 9 KnowledgeItem).
    meta: dict = Field(default_factory=dict, sa_column=Column("metadata", JSON))