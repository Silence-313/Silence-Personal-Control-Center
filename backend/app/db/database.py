"""SQLite engine, session factory, and schema init (SQLModel)."""

import logging

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import DATA_DIR, settings
from app.db.migrations import migrate

logger = logging.getLogger("silence.backend.db")


def _make_engine():
    kwargs: dict = {}
    if settings.database_url.startswith("sqlite"):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(settings.database_url, **kwargs)


engine = _make_engine()


def get_session():
    """FastAPI dependency yielding a scoped SQLModel session."""
    with Session(engine) as session:
        yield session


def init_db() -> None:
    # Importing the models package registers tables on SQLModel.metadata.
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    # Additive, idempotent migrations (Phase 8: Activity association columns).
    migrate(engine)
    # Seed the Session Plane from the agents.yaml registry (idempotent: only
    # when the sessions table is empty; the YAML is never written back).
    from app.services import session_service

    with Session(engine) as db_session:
        seeded = session_service.seed_from_registry(db_session)
    if seeded:
        logger.info("session plane seeded", extra={"count": seeded})

    # Phase 9: idempotently rebuild the knowledge index + relation graph from
    # the registries and live tables (upsert; never touches source YAML).
    from app.knowledge import service as knowledge_service

    with Session(engine) as db_session:
        knowledge_service.sync(db_session)

    logger.info("database initialized", extra={"database_url": settings.database_url})