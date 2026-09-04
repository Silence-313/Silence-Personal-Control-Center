"""Knowledge Plane models (SQLite): unified metadata index + entity graph.

``knowledge_items`` is a unified, searchable index over every existing plane
(projects, agents, research, sessions, activities) seeded automatically from the
existing registries/tables, plus manual overrides from ``config/knowledge.yaml``.
``relations`` is the derived entity graph. Both are rebuilt idempotently (upsert
by deterministic key); they are never authored directly through the API.
"""

from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

# Knowledge entity types (order = indexing/labelling order). "research" is the
# Research Project type; "report" is the Research Report (indexed alongside the
# other research kinds even though the Phase 9 plan type list omitted it — the
# research plane already carries reports, so it is indexed for completeness).
KNOWLEDGE_TYPES = (
    "project",
    "agent",
    "research",
    "paper",
    "dataset",
    "experiment",
    "report",
    "note",
    "session",
    "activity",
)

# Allowed relation semantics (there is no automatic source for `depends_on` /
# `derived_from` in v1 data — those exist for manual knowledge.yaml edges).
RELATION_TYPES = (
    "belongs_to",
    "uses",
    "generated_by",
    "depends_on",
    "references",
    "derived_from",
)


class KnowledgeItem(SQLModel, table=True):
    __tablename__ = "knowledge_items"

    # Namespaced id "{type}:{entity_id}" for global uniqueness across planes.
    id: str = Field(primary_key=True)
    type: str = Field(index=True)
    title: str
    summary: str = ""
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    # SQLAlchemy reserves the attribute name `metadata`, so the Python field is
    # `meta` while the stored column keeps the desired "metadata" name.
    meta: dict = Field(default_factory=dict, sa_column=Column("metadata", JSON))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Relation(SQLModel, table=True):
    __tablename__ = "relations"

    # Deterministic id "{source}|{relation_type}|{target}" → idempotent re-index.
    id: str = Field(primary_key=True)
    source_id: str = Field(index=True)
    target_id: str = Field(index=True)
    relation_type: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.now)