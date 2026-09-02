"""Read-only Docker monitoring via a fixed allowlist of `docker` CLI commands.

No command line is ever built from user input — every invocation is a
hard-coded, read-only `docker` subcommand. Mutations (start/stop/rm/exec/prune)
are intentionally absent.
"""

import json
import logging
import re
import subprocess

from app.schemas.services import (
    ContainerOut,
    DockerContainerCounts,
    DockerDisk,
    DockerSummary,
    ServicesOut,
)

logger = logging.getLogger("silence.backend.docker")

_TIMEOUT = 8


class DockerError(RuntimeError):
    """Docker unavailable or a read-only command failed."""


def _run(args: list[str]) -> str:
    try:
        proc = subprocess.run(
            ["docker", *args], capture_output=True, text=True, timeout=_TIMEOUT
        )
    except FileNotFoundError as exc:
        raise DockerError("docker executable not found") from exc
    except subprocess.TimeoutExpired as exc:
        raise DockerError("docker command timed out") from exc
    if proc.returncode != 0:
        raise DockerError((proc.stderr or "docker command failed").strip())
    return proc.stdout


def server_version() -> str | None:
    try:
        version = _run(["version", "--format", "{{.Server.Version}}"]).strip()
        return version or None
    except DockerError as exc:
        logger.warning("docker version failed", extra={"error": str(exc)})
        return None


def list_containers() -> list[ContainerOut]:
    try:
        out = _run(["ps", "-a", "--format", "{{json .}}"])
    except DockerError as exc:
        logger.warning("docker ps failed", extra={"error": str(exc)})
        return []

    containers: list[ContainerOut] = []
    for line in out.strip().splitlines():
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        state = data.get("State", "")
        if state == "running":
            status = "running"
        elif state == "paused":
            status = "paused"
        else:
            status = "stopped"
        ports = [p.strip() for p in data.get("Ports", "").split(",") if p.strip()]
        containers.append(
            ContainerOut(
                name=data.get("Names", "").split(",")[0],
                image=data.get("Image", ""),
                status=status,
                status_text=data.get("Status", ""),
                ports=ports,
                created_at=data.get("CreatedAt", ""),
            )
        )
    return containers


_SIZE_UNITS: dict[str, float] = {
    "b": 1,
    "kb": 1e3,
    "mb": 1e6,
    "gb": 1e9,
    "tb": 1e12,
    "kib": 1024,
    "mib": 1024**2,
    "gib": 1024**3,
    "tib": 1024**4,
}


def _parse_size(value: str) -> int:
    match = re.match(r"([\d.]+)\s*([A-Za-z]+)", (value or "").strip())
    if not match:
        return 0
    amount = float(match.group(1))
    unit = match.group(2).lower()
    return int(amount * _SIZE_UNITS.get(unit, 1))


_TYPE_KEYS = {
    "images": "images",
    "containers": "containers",
    "local volumes": "volumes",
    "build cache": "build_cache",
}


def disk_usage() -> DockerDisk:
    try:
        out = _run(["system", "df", "--format", "{{json .}}"])
    except DockerError as exc:
        logger.warning("docker system df failed", extra={"error": str(exc)})
        return DockerDisk()

    sizes = {"images": 0, "containers": 0, "volumes": 0, "build_cache": 0}
    for line in out.strip().splitlines():
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        key = _TYPE_KEYS.get(data.get("Type", "").lower())
        if key is not None:
            sizes[key] = _parse_size(data.get("Size", ""))
    return DockerDisk(
        images_bytes=sizes["images"],
        containers_bytes=sizes["containers"],
        volumes_bytes=sizes["volumes"],
        build_cache_bytes=sizes["build_cache"],
    )


def snapshot() -> ServicesOut:
    version = server_version()
    daemon_running = version is not None
    containers = list_containers() if daemon_running else []
    counts = DockerContainerCounts(
        total=len(containers),
        running=sum(1 for c in containers if c.status == "running"),
        paused=sum(1 for c in containers if c.status == "paused"),
    )
    counts.stopped = counts.total - counts.running - counts.paused
    disk = disk_usage() if daemon_running else DockerDisk()
    return ServicesOut(
        docker=DockerSummary(
            version=version,
            daemon_running=daemon_running,
            containers=counts,
            disk=disk,
        ),
        containers=containers,
    )