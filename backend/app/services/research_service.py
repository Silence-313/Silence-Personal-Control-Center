"""Research registry read-model service.

Metadata-only: reads ``config/research.yaml`` and returns typed read models.
Phase 8 enriches Paper/Dataset/Experiment/Report responses with an optional
``runtime`` observation from ``research_observer`` (configured paths only,
READ-ONLY). ``command`` and paths remain opaque metadata strings — nothing is
executed and file contents are never opened.
"""

import logging
from pathlib import Path

import yaml

from app.core.config import settings
from app.schemas.research import (
    DatasetOut,
    ExperimentOut,
    PaperOut,
    ResearchNoteOut,
    ResearchProjectOut,
    ResearchReportOut,
)
from app.services import research_observer

logger = logging.getLogger("silence.backend.research")

KEYS = ("projects", "papers", "datasets", "experiments", "reports", "notes")


class ResearchRegistryError(RuntimeError):
    pass


def load_registry() -> dict:
    path = Path(settings.research_config)
    if not path.exists():
        logger.warning("research registry not found", extra={"path": str(path)})
        return {k: [] for k in KEYS}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        logger.exception("failed to parse research registry", extra={"path": str(path)})
        raise ResearchRegistryError("research registry is not valid YAML") from exc
    return {k: (data.get(k) or []) for k in KEYS}


# --- builders --------------------------------------------------------------

def build_project(entry: dict) -> ResearchProjectOut:
    pid = str(entry.get("id", ""))
    return ResearchProjectOut(
        id=pid,
        name=str(entry.get("name", pid)),
        description=str(entry.get("description", "")),
        status=str(entry.get("status", "active")),
        created_at=str(entry.get("created_at", "")),
        updated_at=str(entry.get("updated_at", "")),
        project_id=entry.get("project_id"),
        repository_path=entry.get("repository_path"),
        tags=[str(t) for t in (entry.get("tags") or [])],
        metadata=entry.get("metadata") or {},
    )


def build_paper(entry: dict) -> PaperOut:
    pid = str(entry.get("id", ""))
    return PaperOut(
        id=pid,
        title=str(entry.get("title", pid)),
        authors=[str(a) for a in (entry.get("authors") or [])],
        year=entry.get("year"),
        venue=entry.get("venue"),
        doi=entry.get("doi"),
        url=entry.get("url"),
        pdf_path=entry.get("pdf_path"),
        status=str(entry.get("status", "unread")),
        tags=[str(t) for t in (entry.get("tags") or [])],
        notes=entry.get("notes"),
        research_project_id=entry.get("research_project_id"),
        created_at=str(entry.get("created_at", "")),
        updated_at=str(entry.get("updated_at", "")),
        runtime=research_observer.observe_path(
            ("papers", pid),
            entry.get("pdf_path"),
            label=str(entry.get("title", pid)),
            research_project_id=entry.get("research_project_id"),
        ),
    )


def build_dataset(entry: dict) -> DatasetOut:
    pid = str(entry.get("id", ""))
    return DatasetOut(
        id=pid,
        name=str(entry.get("name", pid)),
        description=entry.get("description"),
        path=entry.get("path"),
        size_bytes=entry.get("size_bytes"),
        format=entry.get("format"),
        source=entry.get("source"),
        version=entry.get("version"),
        status=str(entry.get("status", "available")),
        research_project_id=entry.get("research_project_id"),
        created_at=str(entry.get("created_at", "")),
        updated_at=str(entry.get("updated_at", "")),
        runtime=research_observer.observe_path(
            ("datasets", pid),
            entry.get("path"),
            label=str(entry.get("name", pid)),
            research_project_id=entry.get("research_project_id"),
        ),
    )


def build_experiment(entry: dict) -> ExperimentOut:
    pid = str(entry.get("id", ""))
    return ExperimentOut(
        id=pid,
        name=str(entry.get("name", pid)),
        description=entry.get("description"),
        research_project_id=entry.get("research_project_id"),
        status=str(entry.get("status", "planned")),
        started_at=entry.get("started_at"),
        ended_at=entry.get("ended_at"),
        dataset_id=entry.get("dataset_id"),
        command=entry.get("command"),
        result=entry.get("result"),
        metrics=entry.get("metrics"),
        artifact_path=entry.get("artifact_path"),
        created_at=str(entry.get("created_at", "")),
        updated_at=str(entry.get("updated_at", "")),
        runtime=research_observer.observe_path(
            ("experiments", pid),
            entry.get("artifact_path"),
            label=str(entry.get("name", pid)),
            research_project_id=entry.get("research_project_id"),
        ),
    )


def build_report(entry: dict) -> ResearchReportOut:
    pid = str(entry.get("id", ""))
    return ResearchReportOut(
        id=pid,
        title=str(entry.get("title", pid)),
        description=entry.get("description"),
        path=entry.get("path"),
        format=str(entry.get("format", "markdown")),
        research_project_id=entry.get("research_project_id"),
        status=str(entry.get("status", "draft")),
        created_at=str(entry.get("created_at", "")),
        updated_at=str(entry.get("updated_at", "")),
        runtime=research_observer.observe_path(
            ("reports", pid),
            entry.get("path"),
            label=str(entry.get("title", pid)),
            research_project_id=entry.get("research_project_id"),
        ),
    )


def build_note(entry: dict) -> ResearchNoteOut:
    pid = str(entry.get("id", ""))
    return ResearchNoteOut(
        id=pid,
        title=str(entry.get("title", pid)),
        content=entry.get("content"),
        research_project_id=entry.get("research_project_id"),
        tags=[str(t) for t in (entry.get("tags") or [])],
        created_at=str(entry.get("created_at", "")),
        updated_at=str(entry.get("updated_at", "")),
    )


# --- list / get ------------------------------------------------------------

def list_projects() -> list[ResearchProjectOut]:
    return [build_project(e) for e in load_registry()["projects"]]


def get_project(pid: str) -> ResearchProjectOut | None:
    for e in load_registry()["projects"]:
        if str(e.get("id", "")) == pid:
            return build_project(e)
    return None


def list_papers() -> list[PaperOut]:
    return [build_paper(e) for e in load_registry()["papers"]]


def get_paper(pid: str) -> PaperOut | None:
    for e in load_registry()["papers"]:
        if str(e.get("id", "")) == pid:
            return build_paper(e)
    return None


def list_datasets() -> list[DatasetOut]:
    return [build_dataset(e) for e in load_registry()["datasets"]]


def get_dataset(pid: str) -> DatasetOut | None:
    for e in load_registry()["datasets"]:
        if str(e.get("id", "")) == pid:
            return build_dataset(e)
    return None


def list_experiments() -> list[ExperimentOut]:
    return [build_experiment(e) for e in load_registry()["experiments"]]


def get_experiment(pid: str) -> ExperimentOut | None:
    for e in load_registry()["experiments"]:
        if str(e.get("id", "")) == pid:
            return build_experiment(e)
    return None


def list_reports() -> list[ResearchReportOut]:
    return [build_report(e) for e in load_registry()["reports"]]


def get_report(pid: str) -> ResearchReportOut | None:
    for e in load_registry()["reports"]:
        if str(e.get("id", "")) == pid:
            return build_report(e)
    return None


def list_notes() -> list[ResearchNoteOut]:
    return [build_note(e) for e in load_registry()["notes"]]


def get_note(pid: str) -> ResearchNoteOut | None:
    for e in load_registry()["notes"]:
        if str(e.get("id", "")) == pid:
            return build_note(e)
    return None