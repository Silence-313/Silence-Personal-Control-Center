"""Idempotent SQLite schema migrations.

``SQLModel.metadata.create_all`` creates missing tables but never alters an
existing table, so additive columns need explicit ``ALTER TABLE`` steps.
Every step in this module must be safe to re-run on an already-migrated
database: it inspects current columns and only issues an ``ALTER`` when a
column is absent. All migrations are strictly additive (nullable columns
only) and never drop or rename anything.

Phase 8 adds the Activity association columns introduced in the model:
``project_id``, ``agent_id``, ``session_id``, ``research_project_id``.
"""

import logging

logger = logging.getLogger("silence.backend.db")

# Additive nullable columns per table, introduced in Phase 8.
_ACTIVITIES_ASSOCIATION_COLUMNS = (
    "project_id",
    "agent_id",
    "session_id",
    "research_project_id",
)

# Phase 10 Step 4 timeline columns (nullable, additive).
_ACTIVITIES_TIMELINE_COLUMNS = (
    "severity",
    "category",
)


def _table_columns(engine, table: str) -> set[str]:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
        return {row[1] for row in rows}


def _migrate_activities(engine) -> None:
    """Add the Activity association columns when missing (idempotent)."""
    existing = _table_columns(engine, "activities")
    if not existing:
        # Table not created yet (fresh database): create_all already includes
        # the new columns, so there is nothing to alter.
        logger.debug("migration: activities table absent, nothing to alter")
        return
    missing = [c for c in _ACTIVITIES_ASSOCIATION_COLUMNS if c not in existing]
    if not missing:
        logger.debug("migration: activities already up to date")
        return
    with engine.begin() as conn:
        for column in missing:
            conn.exec_driver_sql(
                f"ALTER TABLE activities ADD COLUMN {column} VARCHAR"
            )
            logger.info("migration: activities + %s", column)


def _migrate_activity_timeline(engine) -> None:
    """Add Activity severity/category columns when missing (idempotent)."""
    existing = _table_columns(engine, "activities")
    if not existing:
        logger.debug("migration: activities table absent, nothing to alter")
        return
    missing = [c for c in _ACTIVITIES_TIMELINE_COLUMNS if c not in existing]
    if not missing:
        logger.debug("migration: activity timeline already up to date")
        return
    with engine.begin() as conn:
        for column in missing:
            conn.exec_driver_sql(
                f"ALTER TABLE activities ADD COLUMN {column} VARCHAR"
            )
            logger.info("migration: activities + %s", column)


def migrate(engine) -> None:
    """Apply all registered idempotent migrations (safe to re-run).

    Call after ``SQLModel.metadata.create_all`` on startup and in tests.
    """
    _migrate_activities(engine)
    _migrate_activity_timeline(engine)