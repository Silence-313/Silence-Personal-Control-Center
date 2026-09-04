"""Knowledge Plane read-model schemas (metadata only)."""

from pydantic import BaseModel


class KnowledgeItemOut(BaseModel):
    id: str  # namespaced "{type}:{entity_id}"
    entity_id: str  # raw entity id for /context/{type}/{id} navigation
    type: str
    title: str
    summary: str
    tags: list[str]
    metadata: dict
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601


class RelationOut(BaseModel):
    id: str  # deterministic "{source}|{relation_type}|{target}"
    source_id: str  # namespaced
    target_id: str  # namespaced
    relation_type: str
    created_at: str  # ISO 8601