"""Read-only local hardware info (sysctl + psutil)."""

import functools
import logging
import socket
import subprocess
import time

import psutil

logger = logging.getLogger("silence.backend.hardware")


def _sysctl(key: str) -> str:
    try:
        proc = subprocess.run(
            ["sysctl", "-n", key], capture_output=True, text=True, timeout=5
        )
        if proc.returncode == 0:
            return proc.stdout.strip()
    except Exception:
        logger.debug("sysctl failed", extra={"key": key})
    return ""


@functools.lru_cache(maxsize=1)
def static_info() -> dict:
    chip = _sysctl("machdep.cpu.brand_string") or "Apple Silicon"
    model = _sysctl("hw.model") or "unknown"
    perf = int(_sysctl("hw.perflevel0.logicalcpu") or 0)
    eff = int(_sysctl("hw.perflevel1.logicalcpu") or 0)
    cores = psutil.cpu_count(logical=True) or (perf + eff) or 0
    memory_gb = round(psutil.virtual_memory().total / (1024**3))
    return {
        "model": model,
        "chip": chip,
        "cpu_cores": cores,
        "performance_cores": perf,
        "efficiency_cores": eff,
        "memory_gb": memory_gb,
        "gpu": "unknown",
    }


def local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # UDP connect without sending traffic to discover the outbound interface.
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def uptime_seconds() -> float:
    return round(time.time() - psutil.boot_time(), 1)