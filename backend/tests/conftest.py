"""Test configuration.

Point SQLite at a throwaway database BEFORE the app is imported, so tests
never pollute the development database. Set a test API token and authenticate
the default client as admin, since protected endpoints now require access.
"""

import os
from pathlib import Path

_TEST_DB = "sqlite:///./data/test-control-center.db"
os.environ["CONTROL_CENTER_DATABASE_URL"] = _TEST_DB
os.environ["CONTROL_CENTER_API_TOKEN"] = "test-token"

# Remove any stale test database from a previous run.
Path("data/test-control-center.db").unlink(missing_ok=True)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _bootstrap_session_plane():
    """Seed the Session Plane exactly once from the real agents.yaml, before
    any test can monkeypatch the registry path, so HTTP tests observe a
    deterministic Session Plane regardless of execution order. Idempotent:
    later init_db() calls skip seeding because the table is non-empty."""
    from sqlmodel import Session

    from app.db.database import engine, init_db
    from app.services import session_service

    init_db()
    with Session(engine) as db_session:
        session_service.seed_from_registry(db_session)
    yield


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app, headers={"Authorization": "Bearer test-token"}) as test_client:
        yield test_client