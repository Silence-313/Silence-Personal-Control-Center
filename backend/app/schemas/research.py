"""Research read-model schemas (control-plane only — metadata, no execution).

All timestamp fields are ISO 8601 strings. Paths (pdf_path / path / repository_path /
artifact_path) and ``command`` are metadata strings only; nothing here is read
from disk or executed. Phase 8 adds the optional ``runtime`` observation
object (exists / missing / size_bytes / modified_at / error) for registered
paths — add-only, never executes, never opens file contents.
"""

from pydantic import BaseModel


class RuntimeOut(BaseModel):
    """Ephemeral observation of a registered path (configured paths only)."""

    exists: bool
    missing: bool
    size_bytes: int | None = None
    modified_at: str | None = None  # ISO 8601
    error: str | None = None  # short reason; never stack traces or full paths


class ResearchProjectOut(BaseModel):
    id: str
    name: str
    description: str = ""
    status: str  # active | paused | completed | archived
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601
    project_id: str | None = None  # optional Phase 5 code-project id
    repository_path: str | None = None
    tags: list[str] = []
    metadata: dict = {}


class PaperOut(BaseModel):
    id: str
    title: str
    authors: list[str] = []
    year: int | None = None
    venue: str | None = None
    doi: str | None = None
    url: str | None = None
    pdf_path: str | None = None
    status: str  # unread | reading | read | archived
    tags: list[str] = []
    notes: str | None = None
    research_project_id: str | None = None
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601
    runtime: RuntimeOut | None = None  # Phase 8 add-only observation


class DatasetOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    path: str | None = None
    size_bytes: int | None = None
    format: str | None = None
    source: str | None = None
    version: str | None = None
    status: str  # available | missing | archived
    research_project_id: str | None = None
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601
    runtime: RuntimeOut | None = None  # Phase 8 add-only observation


class ExperimentOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    research_project_id: str | None = None
    status: str  # planned | running | completed | failed | cancelled
    started_at: str | None = None
    ended_at: str | None = None
    dataset_id: str | None = None
    command: str | None = None
    result: str | None = None
    metrics: dict | None = None
    artifact_path: str | None = None
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601
    runtime: RuntimeOut | None = None  # Phase 8 add-only observation


class ResearchReportOut(BaseModel):
    id: str
    title: str
    description: str | None = None
    path: str | None = None
    format: str  # markdown | pdf | html | other
    research_project_id: str | None = None
    status: str  # draft | completed | archived
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601
    runtime: RuntimeOut | None = None  # Phase 8 add-only observation


class ResearchNoteOut(BaseModel):
    id: str
    title: str
    content: str | None = None
    research_project_id: str | None = None
    tags: list[str] = []
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601