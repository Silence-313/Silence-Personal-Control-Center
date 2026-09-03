from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import config
from app.main import app
from app.services import research_service
from app.services.research_service import ResearchRegistryError

REGISTRY = """\
projects:
  - id: research-g1
    name: G1 Motion Control
    description: RL locomotion
    status: active
    created_at: "2026-08-01T10:00:00Z"
    updated_at: "2026-09-03T09:40:00Z"
    project_id: null
    repository_path: null
    tags: [G1, RL]
    metadata: {demo: true}

papers:
  - id: paper-gvhmr
    title: Generalizable Human Motion Reconstruction
    authors: [A. Author, B. Author]
    year: 2023
    venue: arXiv
    doi: "10.48550/x"
    url: null
    pdf_path: papers/gvhmr.pdf
    status: unread
    tags: [HMR]
    notes: null
    research_project_id: research-g1
    created_at: "2026-08-06T10:00:00Z"
    updated_at: "2026-08-06T10:00:00Z"

datasets:
  - id: ds-mocap
    name: Humanoid Motion Capture Clips
    path: /Volumes/Research/mocap/v3
    size_bytes: 697932185600
    format: mocap
    source: Vicon
    version: v3
    status: available
    research_project_id: research-g1
    created_at: "2026-08-01T10:00:00Z"
    updated_at: "2026-09-01T10:00:00Z"

experiments:
  - id: exp-g1-terrain
    name: Terrain curriculum
    description: null
    research_project_id: research-g1
    status: running
    started_at: "2026-09-02T12:00:00Z"
    ended_at: null
    dataset_id: ds-mocap
    command: "python train.py --env g1 --terrain"
    result: null
    metrics: {policy_iter: 42000}
    artifact_path: null
    created_at: "2026-09-02T12:00:00Z"
    updated_at: "2026-09-03T09:50:00Z"

reports:
  - id: rep-weekly
    title: Weekly Research Digest
    description: null
    path: reports/weekly.md
    format: markdown
    research_project_id: research-g1
    status: draft
    created_at: "2026-09-03T08:00:00Z"
    updated_at: "2026-09-03T08:00:00Z"

notes:
  - id: note-reading
    title: Reading list
    content: Curated queue
    research_project_id: research-g1
    tags: [reading]
    created_at: "2026-09-01T09:00:00Z"
    updated_at: "2026-09-03T02:00:00Z"
"""

EMPTY = "projects: []\npapers: []\ndatasets: []\nexperiments: []\nreports: []\nnotes: []\n"

LIST_PATHS = ["projects", "papers", "datasets", "experiments", "reports", "notes"]
DETAIL_ID = {
    "projects": "research-g1",
    "papers": "paper-gvhmr",
    "datasets": "ds-mocap",
    "experiments": "exp-g1-terrain",
    "reports": "rep-weekly",
    "notes": "note-reading",
}


def _use_registry(tmp_path: Path, monkeypatch, content: str = REGISTRY) -> None:
    path = tmp_path / "research.yaml"
    path.write_text(content, encoding="utf-8")
    monkeypatch.setattr(config.settings, "research_config", str(path))


def test_all_lists(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch)
    for name in LIST_PATHS:
        assert client.get(f"/api/v1/research/{name}").json() != []
    assert client.get("/api/v1/research/projects").json()[0]["id"] == "research-g1"
    assert client.get("/api/v1/research/papers").json()[0]["title"] == (
        "Generalizable Human Motion Reconstruction"
    )
    assert client.get("/api/v1/research/experiments").json()[0]["status"] == "running"


def test_detail_fields(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch)
    p = client.get("/api/v1/research/projects/research-g1").json()
    assert p["name"] == "G1 Motion Control"
    assert p["status"] == "active"
    assert p["tags"] == ["G1", "RL"]
    assert p["metadata"] == {"demo": True}

    paper = client.get("/api/v1/research/papers/paper-gvhmr").json()
    assert paper["authors"] == ["A. Author", "B. Author"]
    assert paper["year"] == 2023
    assert paper["pdf_path"] == "papers/gvhmr.pdf"
    assert paper["research_project_id"] == "research-g1"

    exp = client.get("/api/v1/research/experiments/exp-g1-terrain").json()
    assert exp["command"] == "python train.py --env g1 --terrain"
    assert exp["metrics"] == {"policy_iter": 42000}
    assert exp["dataset_id"] == "ds-mocap"
    assert exp["ended_at"] is None


def test_unknown_404(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch)
    for name in LIST_PATHS:
        assert client.get(f"/api/v1/research/{name}/nope").status_code == 404


def test_authentication_required() -> None:
    with TestClient(app) as bare:
        for name in LIST_PATHS:
            assert bare.get(f"/api/v1/research/{name}").status_code == 401


def test_empty_registry(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch, EMPTY)
    for name in LIST_PATHS:
        assert client.get(f"/api/v1/research/{name}").json() == []


def test_bad_yaml_raises(monkeypatch, tmp_path: Path) -> None:
    path = tmp_path / "research.yaml"
    path.write_text("projects: [unclosed\n", encoding="utf-8")
    monkeypatch.setattr(config.settings, "research_config", str(path))
    with pytest.raises(ResearchRegistryError):
        research_service.list_projects()


def test_relationships_consistent(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    _use_registry(tmp_path, monkeypatch)
    project_ids = {p["id"] for p in client.get("/api/v1/research/projects").json()}
    for name in ["papers", "datasets", "experiments", "reports", "notes"]:
        for item in client.get(f"/api/v1/research/{name}").json():
            if item.get("research_project_id"):
                assert item["research_project_id"] in project_ids