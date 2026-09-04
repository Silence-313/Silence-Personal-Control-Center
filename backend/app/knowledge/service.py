"""Knowledge Plane service: automatic indexing + relation graph (READ-ONLY).

``knowledge_items`` and ``relations`` are derived from the existing registries
(projects/agents/research) and the live sessions/activities tables, then merged
with manual overrides from ``config/knowledge.yaml``. ``sync()`` is idempotent
(upsert by deterministic key) and is run once at startup. Nothing here executes
commands, mutates the source registries, or reads file contents.
"""

import logging
from datetime import datetime, timezone
from pathlib import Path

import yaml
from sqlmodel import Session, or_, select

from app.core.config import settings
from app.knowledge.models import (
    KNOWLEDGE_TYPES,
    RELATION_TYPES,
    KnowledgeItem,
    Relation,
)
from app.models.command import Activity
from app.models.session import SessionRecord
from app.schemas.knowledge import KnowledgeItemOut, RelationOut
from app.services import agent_service, project_service, research_service

logger = logging.getLogger("silence.backend.knowledge")


# --- id helpers -------------------------------------------------------------


def nsid(type_: str, entity_id: str) -> str:
    """Namespaced id, globally unique across planes."""
    return f"{type_}:{entity_id}"


def un_ns(id_: str) -> tuple[str, str]:
    """Split a namespaced id into (type, entity_id)."""
    if ":" in id_:
        type_, entity_id = id_.split(":", 1)
        return type_, entity_id
    return "", id_


def entity_id_of(id_: str) -> str:
    return un_ns(id_)[1]


# --- datetime helpers -------------------------------------------------------


def _to_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    s = str(value).strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _first_sentence(text) -> str:
    if not text:
        return ""
    first = str(text).strip().splitlines()[0].strip()
    return first[:200]


# --- out mappers ------------------------------------------------------------


def to_item_out(item: KnowledgeItem) -> KnowledgeItemOut:
    return KnowledgeItemOut(
        id=item.id,
        entity_id=entity_id_of(item.id),
        type=item.type,
        title=item.title,
        summary=item.summary or "",
        tags=item.tags or [],
        metadata=item.meta or {},
        created_at=_iso(item.created_at),
        updated_at=_iso(item.updated_at),
    )


def to_relation_out(rel: Relation) -> RelationOut:
    return RelationOut(
        id=rel.id,
        source_id=rel.source_id,
        target_id=rel.target_id,
        relation_type=rel.relation_type,
        created_at=_iso(rel.created_at),
    )


# --- item builders ----------------------------------------------------------


def _make_item(
    type_: str,
    entity_id: str,
    title: str,
    summary: str = "",
    tags: list[str] | None = None,
    metadata: dict | None = None,
    raw: dict | None = None,
) -> KnowledgeItem:
    raw = raw or {}
    return KnowledgeItem(
        id=nsid(type_, entity_id),
        type=type_,
        title=title,
        summary=summary or "",
        tags=list(tags or []),
        meta=dict(metadata or {}),
        created_at=_to_dt(raw.get("created_at")) or datetime.now(),
        updated_at=_to_dt(raw.get("updated_at")) or datetime.now(),
    )


def _derive_static_items() -> list[KnowledgeItem]:
    items: list[KnowledgeItem] = []

    for e in project_service.load_registry():
        pid = str(e.get("id", ""))
        if not pid:
            continue
        items.append(
            _make_item(
                "project",
                pid,
                str(e.get("name", pid)),
                "",
                [],
                {"path": e.get("path"), "type": e.get("type")},
                e,
            )
        )

    for e in agent_service.load_registry().get("agents", []):
        aid = str(e.get("id", ""))
        if not aid:
            continue
        items.append(
            _make_item(
                "agent",
                aid,
                str(e.get("name", aid)),
                str(e.get("description", "") or ""),
                [str(c) for c in (e.get("capabilities") or [])],
                {
                    "status": e.get("status"),
                    "current_project_id": e.get("current_project_id"),
                },
                e,
            )
        )

    reg = research_service.load_registry()
    for e in reg.get("projects", []):
        rpid = str(e.get("id", ""))
        if not rpid:
            continue
        items.append(
            _make_item(
                "research",
                rpid,
                str(e.get("name", rpid)),
                str(e.get("description", "") or ""),
                [str(t) for t in (e.get("tags") or [])],
                {"project_id": e.get("project_id"), "status": e.get("status")},
                e,
            )
        )

    for e in reg.get("papers", []):
        pid = str(e.get("id", ""))
        if not pid:
            continue
        items.append(
            _make_item(
                "paper",
                pid,
                str(e.get("title", pid)),
                "",
                [str(t) for t in (e.get("tags") or [])],
                {
                    "authors": e.get("authors"),
                    "year": e.get("year"),
                    "research_project_id": e.get("research_project_id"),
                },
                e,
            )
        )

    for e in reg.get("datasets", []):
        did = str(e.get("id", ""))
        if not did:
            continue
        items.append(
            _make_item(
                "dataset",
                did,
                str(e.get("name", did)),
                str(e.get("description", "") or ""),
                [],
                {
                    "research_project_id": e.get("research_project_id"),
                    "format": e.get("format"),
                },
                e,
            )
        )

    for e in reg.get("experiments", []):
        eid = str(e.get("id", ""))
        if not eid:
            continue
        items.append(
            _make_item(
                "experiment",
                eid,
                str(e.get("name", eid)),
                str(e.get("description", "") or ""),
                [],
                {
                    "research_project_id": e.get("research_project_id"),
                    "dataset_id": e.get("dataset_id"),
                    "status": e.get("status"),
                },
                e,
            )
        )

    for e in reg.get("reports", []):
        rid = str(e.get("id", ""))
        if not rid:
            continue
        items.append(
            _make_item(
                "report",
                rid,
                str(e.get("title", rid)),
                str(e.get("description", "") or ""),
                [],
                {"research_project_id": e.get("research_project_id"), "format": e.get("format")},
                e,
            )
        )

    for e in reg.get("notes", []):
        nid = str(e.get("id", ""))
        if not nid:
            continue
        items.append(
            _make_item(
                "note",
                nid,
                str(e.get("title", nid)),
                _first_sentence(e.get("content")),
                [str(t) for t in (e.get("tags") or [])],
                {"research_project_id": e.get("research_project_id")},
                e,
            )
        )

    return items


def _derive_live_items(session: Session) -> list[KnowledgeItem]:
    items: list[KnowledgeItem] = []
    for s in session.exec(select(SessionRecord)).all():
        items.append(
            KnowledgeItem(
                id=nsid("session", s.id),
                type="session",
                title=f"{s.agent_id} · {s.id}",
                summary=s.current_task or "",
                tags=[s.agent_id],
                meta={
                    "agent_id": s.agent_id,
                    "project_id": s.project_id,
                    "research_project_id": s.research_project_id,
                    "status": s.status,
                },
                created_at=s.started_at,
                updated_at=s.last_activity_at or s.started_at,
            )
        )
    for a in session.exec(select(Activity)).all():
        items.append(
            KnowledgeItem(
                id=nsid("activity", a.id),
                type="activity",
                title=a.message,
                summary=f"{a.type}/{a.action}",
                tags=[a.type, a.action] if a.action else [a.type],
                meta={
                    "node_id": a.node_id,
                    "project_id": a.project_id,
                    "agent_id": a.agent_id,
                    "session_id": a.session_id,
                    "research_project_id": a.research_project_id,
                },
                created_at=a.timestamp,
                updated_at=a.timestamp,
            )
        )
    return items


def _load_manual() -> dict:
    path = Path(settings.knowledge_config)
    if not path.exists():
        return {}
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError:
        logger.warning("knowledge.yaml is not valid YAML; ignoring", extra={"path": str(path)})
        return {}


def _manual_items() -> list[KnowledgeItem]:
    data = _load_manual()
    items: list[KnowledgeItem] = []
    for e in data.get("items", []) or []:
        type_ = str(e.get("type", "")).lower()
        eid = str(e.get("id", ""))
        if not type_ or not eid or type_ not in KNOWLEDGE_TYPES:
            logger.warning("skipping invalid knowledge item", extra={"id": eid, "type": type_})
            continue
        items.append(
            _make_item(
                type_,
                eid,
                str(e.get("title", eid)),
                str(e.get("summary", "") or ""),
                [str(t) for t in (e.get("tags") or [])],
                e.get("metadata") or {},
                e,
            )
        )
    return items


# --- relation derivation ----------------------------------------------------


def _derive_relations(session: Session) -> list[Relation]:
    rels: dict[str, Relation] = {}

    def add(source: str, target: str | None, rtype: str) -> None:
        if not target:
            return
        rid = f"{source}|{rtype}|{target}"
        rels[rid] = Relation(id=rid, source_id=source, target_id=target, relation_type=rtype)

    reg = research_service.load_registry()
    for e in reg.get("projects", []):
        rpid = str(e.get("id", ""))
        if rpid and e.get("project_id"):
            add(nsid("research", rpid), nsid("project", str(e.get("project_id"))), "references")

    for kind, kind_type in (
        ("papers", "paper"),
        ("datasets", "dataset"),
        ("experiments", "experiment"),
        ("reports", "report"),
        ("notes", "note"),
    ):
        for e in reg.get(kind, []):
            eid = str(e.get("id", ""))
            if eid and e.get("research_project_id"):
                add(
                    nsid(kind_type, eid),
                    nsid("research", str(e.get("research_project_id"))),
                    "belongs_to",
                )

    for e in reg.get("experiments", []):
        eid = str(e.get("id", ""))
        if eid and e.get("dataset_id"):
            add(nsid("experiment", eid), nsid("dataset", str(e.get("dataset_id"))), "uses")

    for e in agent_service.load_registry().get("agents", []):
        aid = str(e.get("id", ""))
        if aid and e.get("current_project_id"):
            add(nsid("agent", aid), nsid("project", str(e.get("current_project_id"))), "references")

    for s in session.exec(select(SessionRecord)).all():
        sns = nsid("session", s.id)
        if s.agent_id:
            add(sns, nsid("agent", s.agent_id), "generated_by")
        if s.project_id:
            add(sns, nsid("project", s.project_id), "references")
        if s.research_project_id:
            add(sns, nsid("research", s.research_project_id), "references")

    for a in session.exec(select(Activity)).all():
        ans = nsid("activity", a.id)
        if a.agent_id:
            add(ans, nsid("agent", a.agent_id), "references")
        if a.session_id:
            add(ans, nsid("session", a.session_id), "references")
        if a.project_id:
            add(ans, nsid("project", a.project_id), "references")
        if a.research_project_id:
            add(ans, nsid("research", a.research_project_id), "references")

    return list(rels.values())


def _manual_relations() -> list[Relation]:
    data = _load_manual()
    rels: list[Relation] = []
    for e in data.get("relations", []) or []:
        src = str(e.get("source_id", ""))
        dst = str(e.get("target_id", ""))
        rt = str(e.get("relation_type", ""))
        if not src or not dst or rt not in RELATION_TYPES:
            logger.warning("skipping invalid manual relation", extra={"source": src, "target": dst})
            continue
        rid = f"{src}|{rt}|{dst}"
        rels.append(Relation(id=rid, source_id=src, target_id=dst, relation_type=rt))
    return rels


# --- sync (idempotent upsert) ----------------------------------------------


def _upsert_items(session: Session, items: list[KnowledgeItem]) -> None:
    existing = {i.id: i for i in session.exec(select(KnowledgeItem)).all()}
    for it in items:
        cur = existing.get(it.id)
        if cur is None:
            session.add(it)
        else:
            cur.type = it.type
            cur.title = it.title
            cur.summary = it.summary
            cur.tags = it.tags
            cur.meta = it.meta
            cur.updated_at = it.updated_at
    session.commit()


def _upsert_relations(session: Session, relations: list[Relation]) -> None:
    existing = {r.id: r for r in session.exec(select(Relation)).all()}
    for rel in relations:
        if rel.id not in existing:
            session.add(rel)
    session.commit()


def sync(session: Session) -> dict:
    """Idempotently rebuild the knowledge index + relation graph.

    Returns a small stats dict. Manual ``knowledge.yaml`` overrides win over the
    auto-derived items/relations of the same deterministic key.
    """
    merged: dict[str, KnowledgeItem] = {}
    for it in _derive_static_items():
        merged[it.id] = it
    for it in _derive_live_items(session):
        merged[it.id] = it
    for it in _manual_items():
        merged[it.id] = it
    _upsert_items(session, list(merged.values()))

    rel_map: dict[str, Relation] = {r.id: r for r in _derive_relations(session)}
    for r in _manual_relations():
        rel_map[r.id] = r
    _upsert_relations(session, list(rel_map.values()))

    logger.info("knowledge index synced", extra={"items": len(merged), "relations": len(rel_map)})
    return {"items": len(merged), "relations": len(rel_map)}


# --- queries ----------------------------------------------------------------


def list_items(
    session: Session,
    *,
    q: str | None = None,
    type_: str | None = None,
    tag: str | None = None,
) -> list[KnowledgeItemOut]:
    stmt = select(KnowledgeItem)
    if type_:
        stmt = stmt.where(KnowledgeItem.type == type_)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                KnowledgeItem.title.like(like),
                KnowledgeItem.summary.like(like),
                KnowledgeItem.tags.like(like),
            )
        )
    items = session.exec(stmt).all()
    if tag:
        items = [i for i in items if tag in (i.tags or [])]
    items = sorted(items, key=lambda i: (i.updated_at or i.created_at), reverse=True)
    return [to_item_out(i) for i in items]


def get_item(session: Session, item_id: str) -> KnowledgeItemOut | None:
    item = session.get(KnowledgeItem, item_id)
    return to_item_out(item) if item else None


def relations_for(session: Session, id_: str) -> list[RelationOut]:
    """All relations touching a (namespaced) id, either direction."""
    stmt = select(Relation).where(
        or_(Relation.source_id == id_, Relation.target_id == id_)
    )
    return [to_relation_out(r) for r in session.exec(stmt).all()]


def list_relations(session: Session, id_: str) -> list[RelationOut]:
    """Relations for an id, accepting a namespaced id or a bare entity id."""
    stmt = select(Relation).where(
        or_(
            Relation.source_id == id_,
            Relation.target_id == id_,
            Relation.source_id.like(f"%:{id_}"),
            Relation.target_id.like(f"%:{id_}"),
        )
    )
    return [to_relation_out(r) for r in session.exec(stmt).all()]