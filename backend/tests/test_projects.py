import subprocess
from pathlib import Path

from fastapi.testclient import TestClient

from app.core import config
from app.main import app
from app.services import git_service


def _make_repo(root: Path) -> Path:
    repo = root / "proj"
    repo.mkdir()
    subprocess.run(["git", "init", "-b", "main", str(repo)], check=True, capture_output=True)
    (repo / "README.md").write_text("hello", encoding="utf-8")
    subprocess.run(["git", "-C", str(repo), "add", "."], check=True, capture_output=True)
    subprocess.run(
        ["git", "-C", str(repo), "-c", "user.email=a@b.c", "-c", "user.name=t", "commit", "-m", "init"],
        check=True,
        capture_output=True,
    )
    return repo


def _registry(tmp_path: Path, entry: str) -> str:
    path = tmp_path / "projects.yaml"
    path.write_text(f"projects:\n{entry}", encoding="utf-8")
    return str(path)


def test_git_service_read(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    assert git_service.branch(repo) == "main"
    assert git_service.porcelain(repo).strip() == ""
    assert git_service.last_commit_hash(repo)
    assert git_service.last_commit_subject(repo) == "init"


def test_projects_empty_by_default(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    # Point at an empty registry, since the real config now lists live projects.
    empty = tmp_path / "empty.yaml"
    empty.write_text("projects: []\n", encoding="utf-8")
    monkeypatch.setattr(config.settings, "projects_config", str(empty))

    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    assert response.json() == []


def test_projects_from_registry(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    monkeypatch.setattr(
        config.settings,
        "projects_config",
        _registry(tmp_path, f"- id: p1\n  name: Proj One\n  path: {repo}\n  type: git\n"),
    )

    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == "p1"
    assert body[0]["branch"] == "main"
    assert body[0]["git_status"] == "clean"
    assert body[0]["health"] == "healthy"
    assert body[0]["last_commit"]
    assert body[0]["node_id"]

    single = client.get("/api/v1/projects/p1")
    assert single.status_code == 200
    assert single.json()["name"] == "Proj One"
    assert single.json()["head"] == body[0]["head"]


def test_project_dirty_working_tree(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    (repo / "README.md").write_text("changed", encoding="utf-8")
    monkeypatch.setattr(
        config.settings,
        "projects_config",
        _registry(tmp_path, f"- id: p1\n  name: P1\n  path: {repo}\n  type: git\n"),
    )

    body = client.get("/api/v1/projects").json()
    assert body[0]["git_status"] == "dirty"
    assert body[0]["health"] == "dirty"
    assert body[0]["modified"] >= 1


def test_project_remote_and_head(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    subprocess.run(
        ["git", "-C", str(repo), "remote", "add", "origin", "https://example.com/r.git"],
        check=True,
        capture_output=True,
    )
    monkeypatch.setattr(
        config.settings,
        "projects_config",
        _registry(tmp_path, f"- id: p1\n  name: P1\n  path: {repo}\n  type: git\n"),
    )

    body = client.get("/api/v1/projects").json()[0]
    assert body["remote"] == "https://example.com/r.git"
    assert len(body["head"]) == 40
    assert body["ahead"] is None or body["ahead"] == 0
    assert body["health"] == "healthy"


def test_project_missing_repo(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    missing = tmp_path / "does-not-exist"
    monkeypatch.setattr(
        config.settings,
        "projects_config",
        _registry(tmp_path, f"- id: p1\n  name: P1\n  path: {missing}\n  type: git\n"),
    )

    body = client.get("/api/v1/projects").json()[0]
    assert body["git_status"] == "not_found"
    assert body["health"] == "error"


def test_project_not_a_repo(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    plain = tmp_path / "plain"
    plain.mkdir()
    monkeypatch.setattr(
        config.settings,
        "projects_config",
        _registry(tmp_path, f"- id: p1\n  name: P1\n  path: {plain}\n  type: git\n"),
    )

    body = client.get("/api/v1/projects").json()[0]
    assert body["git_status"] == "not_a_repo"
    assert body["health"] == "error"


def test_project_unconfigured(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        config.settings,
        "projects_config",
        _registry(tmp_path, "- id: p1\n  name: P1\n  type: other\n  path: /somewhere\n"),
    )

    body = client.get("/api/v1/projects").json()[0]
    assert body["git_status"] == "unconfigured"
    assert body["health"] == "unknown"


def test_project_node_id_from_registry(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    monkeypatch.setattr(
        config.settings,
        "projects_config",
        _registry(tmp_path, f"- id: p1\n  name: P1\n  path: {repo}\n  type: git\n  node_id: mac-studio\n"),
    )

    body = client.get("/api/v1/projects").json()[0]
    assert body["node_id"] == "mac-studio"


def test_project_not_found_404(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    empty = tmp_path / "empty.yaml"
    empty.write_text("projects: []\n", encoding="utf-8")
    monkeypatch.setattr(config.settings, "projects_config", str(empty))
    assert client.get("/api/v1/projects/nope").status_code == 404


def test_projects_require_auth() -> None:
    with TestClient(app) as bare:
        assert bare.get("/api/v1/projects").status_code == 401
        assert bare.get("/api/v1/projects/anything").status_code == 401