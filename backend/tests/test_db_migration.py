"""Phase 8 Step 3 — idempotent Activity migration tests.

Uses throwaway SQLite files under tmp_path; never touches the dev or test
databases. Proves:

- migration is re-runnable and safe (run twice, columns added exactly once);
- a pre-migration (old-schema) row stays readable with null associations;
- fresh rows default all association columns to null;
- migration is a no-op on a database that has no activities table.
"""

from datetime import datetime

from sqlmodel import Session, SQLModel, create_engine, select

from app.db.migrations import migrate
from app.models.command import Activity

ASSOCIATION_COLUMNS = {
    "project_id",
    "agent_id",
    "session_id",
    "research_project_id",
}


def _create_old_schema_db(path) -> object:
    """Build a SQLite db with the Phase 7 (pre-migration) activities schema."""
    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "CREATE TABLE activities ("
            "id VARCHAR NOT NULL PRIMARY KEY, "
            "type VARCHAR NOT NULL, "
            "action VARCHAR NOT NULL, "
            "message VARCHAR NOT NULL, "
            "timestamp DATETIME NOT NULL, "
            "node_id VARCHAR, "
            "command_id VARCHAR)"
        )
        conn.exec_driver_sql(
            "CREATE INDEX ix_activities_timestamp ON activities (timestamp)"
        )
    return engine


def _columns(engine) -> set[str]:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql("PRAGMA table_info(activities)").fetchall()
        return {row[1] for row in rows}


def test_migration_adds_columns_and_preserves_old_rows(tmp_path):
    engine = _create_old_schema_db(tmp_path / "old.db")
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "INSERT INTO activities (id, type, action, message, timestamp, "
            "node_id, command_id) VALUES ('act-old', 'node', 'heartbeat', "
            "'legacy row', '2026-09-03T08:00:00', 'macbook-pro', NULL)"
        )

    migrate(engine)
    assert ASSOCIATION_COLUMNS <= _columns(engine)

    with Session(engine) as session:
        row = session.exec(select(Activity)).one()
        assert row.id == "act-old"
        assert row.type == "node"
        assert row.project_id is None
        assert row.agent_id is None
        assert row.session_id is None
        assert row.research_project_id is None


def test_migration_is_idempotent_and_re_runnable(tmp_path):
    engine = _create_old_schema_db(tmp_path / "repeat.db")

    migrate(engine)
    col_run_1 = _columns(engine)

    migrate(engine)
    migrate(engine)
    col_run_3 = _columns(engine)

    assert ASSOCIATION_COLUMNS <= col_run_1
    assert col_run_1 == col_run_3
    # no duplicated columns from repeated ALTERs
    assert len([c for c in col_run_3 if c == "project_id"]) == 1


def test_fresh_rows_default_associations_to_null(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'fresh.db'}")
    SQLModel.metadata.create_all(engine)  # fresh schema already has columns
    migrate(engine)  # no-op on fresh schema, must not error

    with Session(engine) as session:
        session.add(
            Activity(
                id="act-new",
                type="system",
                action="test",
                message="no associations",
                timestamp=datetime.now(),
            )
        )
        session.commit()
        row = session.exec(select(Activity).where(Activity.id == "act-new")).one()
        assert row.project_id is None
        assert row.agent_id is None
        assert row.session_id is None
        assert row.research_project_id is None


def test_migration_is_safe_without_activities_table(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'empty.db'}")
    migrate(engine)  # must not raise
    with engine.connect() as conn:
        tables = {
            r[0]
            for r in conn.exec_driver_sql(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
    assert "activities" not in tables