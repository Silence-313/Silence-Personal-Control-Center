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


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app, headers={"Authorization": "Bearer test-token"}) as test_client:
        yield test_client