"""Knowledge Plane endpoints (READ-ONLY, require_access).

GET-only surface over the auto-indexed knowledge graph: unified item search
(LIKE, not FTS5) plus the relation query used by the Context View.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.knowledge import service as knowledge_service
from app.schemas.knowledge import KnowledgeItemOut, RelationOut

router = APIRouter(
    prefix="/api/v1",
    tags=["knowledge"],
    dependencies=[Depends(require_access)],
)


@router.get("/knowledge", response_model=list[KnowledgeItemOut])
def list_knowledge(
    q: str | None = None,
    type: str | None = None,
    tag: str | None = None,
    session: Session = Depends(get_session),
) -> list[KnowledgeItemOut]:
    return knowledge_service.list_items(session, q=q, type_=type, tag=tag)


@router.get("/knowledge/{item_id}", response_model=KnowledgeItemOut)
def get_knowledge_item(
    item_id: str, session: Session = Depends(get_session)
) -> KnowledgeItemOut:
    item = knowledge_service.get_item(session, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    return item


@router.get("/relations/{id}", response_model=list[RelationOut])
def get_relations(id: str, session: Session = Depends(get_session)) -> list[RelationOut]:
    return knowledge_service.list_relations(session, id)