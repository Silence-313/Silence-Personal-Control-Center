"""Phase 8 Step 7 — Runtime State aggregation tests (READ-ONLY)."""

from fastapi.testclient import TestClient

from app.main import app

# Real registry counts (backend/config/research.yaml)
EXPECTED_PATH_ENTITIES = 8 + 5 + 8 + 5  # papers + datasets + experiments + reports


def test_runtime_state_shape(client: TestClient) -> None:
    body = client.get("/api/v1/runtime/state").json()
    assert set(body) == {
        "counts",
        "observed",
        "observed_paths",
        "recent_activities",
        "generated_at",
    }
    assert body["counts"]["sessions"] >= 3  # seeded Session Plane
    assert body["counts"]["agents"] >= 1
    assert body["counts"]["papers"] == 8
    assert body["counts"]["reports"] == 5
    assert body["observed"]["paths"] == EXPECTED_PATH_ENTITIES
    assert (
        body["observed"]["exists"]
        + body["observed"]["missing"]
        + body["observed"]["error"]
        == EXPECTED_PATH_ENTITIES
    )
    assert all("runtime" in p for p in body["observed_paths"])
    # All registered paths are absent on this host (relative without base or
    # /Volumes datasets) → everything reports missing, nothing errors.
    assert body["observed"]["exists"] == 0
    assert body["observed"]["error"] == 0
    assert body["observed"]["missing"] == EXPECTED_PATH_ENTITIES
    assert body["generated_at"].endswith("Z")
    assert isinstance(body["recent_activities"], list)


def test_runtime_state_requires_auth() -> None:
    with TestClient(app) as bare:
        assert bare.get("/api/v1/runtime/state").status_code == 401