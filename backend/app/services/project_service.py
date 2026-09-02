"""Project registry + read-only git status.

The registry lives in a configuration file (config/projects.yaml); paths are
explicitly supplied by the user and never scanned from the home directory.
"""

import logging
from pathlib import Path

import yaml

from app.core.config import settings
from app.schemas.project import ProjectOut
from app.services import git_service
from app.services.git_service import GitError

logger = logging.getLogger("silence.backend.project")


def load_registry() -> list[dict]:
    path = Path(settings.projects_config)
    if not path.exists():
        return []
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        logger.exception("failed to load project registry", extra={"path": str(path)})
        return []
    return data.get("projects") or []


def build_project(entry: dict) -> ProjectOut:
    project_id = str(entry.get("id", ""))
    name = str(entry.get("name", project_id))
    path = str(entry.get("path", ""))
    project_type = str(entry.get("type", "git"))
    node_id = str(entry.get("node_id") or settings.node_id)

    out = ProjectOut(id=project_id, name=name, node_id=node_id, path=path, type=project_type)

    if not path or project_type != "git":
        out.git_status = "unconfigured"
        out.health = "unknown"
        return out

    repo = Path(path)
    if not repo.exists():
        out.git_status = "not_found"
        out.health = "error"
        return out
    if not (repo / ".git").exists():
        out.git_status = "not_a_repo"
        out.health = "error"
        return out

    try:
        snap = git_service.snapshot(repo)
    except GitError as exc:
        # Do NOT log the absolute path — it is sensitive internal info.
        logger.warning(
            "git read failed", extra={"project_id": project_id, "error": str(exc)}
        )
        out.git_status = "error"
        out.health = "error"
        return out

    out.branch = snap["branch"] or "detached"
    out.modified = int(snap["modified"] or 0)
    out.ahead = snap["ahead"]
    out.behind = snap["behind"]
    out.head = snap["head"]
    out.last_commit = snap["short_hash"]
    out.last_commit_subject = snap["subject"]
    out.last_commit_time = snap["time"]
    out.remote = git_service.remote(repo)

    dirty = out.modified > 0
    out.git_status = "dirty" if dirty else "clean"
    out.health = "dirty" if dirty else "healthy"
    return out


def list_all() -> list[ProjectOut]:
    return [build_project(entry) for entry in load_registry()]


def get_project(project_id: str) -> ProjectOut | None:
    for entry in load_registry():
        if str(entry.get("id", "")) == project_id:
            return build_project(entry)
    return None