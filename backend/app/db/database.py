"""SQLite engine, session factory, and schema init (SQLModel)."""

import logging

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import DATA_DIR, settings

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
    logger.info("database initialized", extra={"database_url": settings.database_url})