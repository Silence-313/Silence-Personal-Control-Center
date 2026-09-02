"""Real-time system metric collection via psutil."""

import logging
import time
from datetime import datetime

import psutil

from app.schemas.metrics import (
    CpuMetrics,
    DiskMetrics,
    MemoryMetrics,
    MetricsOut,
    NetworkMetrics,
)

logger = logging.getLogger("silence.backend.metrics")


def collect() -> MetricsOut:
    # Sample network across the same window as the (blocking) CPU sample.
    net0 = psutil.net_io_counters()
    t0 = time.time()
    # One blocking sample yields both the overall figure and per-core values.
    per_core = psutil.cpu_percent(interval=0.1, percpu=True)
    net1 = psutil.net_io_counters()
    t1 = time.time()
    window = max(t1 - t0, 0.001)
    down_mbps = round((net1.bytes_recv - net0.bytes_recv) * 8 / window / 1e6, 1)
    up_mbps = round((net1.bytes_sent - net0.bytes_sent) * 8 / window / 1e6, 1)

    usage = round(sum(per_core) / len(per_core), 1) if per_core else 0.0

    vm = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    try:
        load_average = [round(x, 2) for x in psutil.getloadavg()]
    except OSError:
        load_average = []

    return MetricsOut(
        cpu=CpuMetrics(
            usage_percent=usage,
            cores=psutil.cpu_count(logical=True) or 0,
            per_core=[round(p, 1) for p in per_core],
            load_average=load_average,
        ),
        memory=MemoryMetrics(
            total_bytes=vm.total,
            used_bytes=vm.used,
            available_bytes=vm.available,
            usage_percent=round(vm.percent, 1),
        ),
        disk=DiskMetrics(
            total_bytes=disk.total,
            used_bytes=disk.used,
            available_bytes=disk.free,
            usage_percent=round(disk.percent, 1),
        ),
        network=NetworkMetrics(down_mbps=down_mbps, up_mbps=up_mbps),
        uptime_seconds=round(time.time() - psutil.boot_time(), 1),
        collected_at=datetime.now(),
    )