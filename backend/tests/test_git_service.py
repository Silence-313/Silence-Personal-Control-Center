import subprocess
from pathlib import Path

from app.services import git_service
from app.services.git_service import GitError


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


def test_parse_ahead_behind() -> None:
    assert git_service._parse_ahead_behind("## main...origin/main") == (None, None)
    assert git_service._parse_ahead_behind("## main...origin/main [ahead 2]") == (2, None)
    assert git_service._parse_ahead_behind("## main...origin/main [behind 3]") == (None, 3)
    assert git_service._parse_ahead_behind("## main...origin/main [ahead 2, behind 1]") == (2, 1)
    assert git_service._parse_ahead_behind("## main") == (None, None)


def test_head_returns_full_sha(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    head = git_service.head(repo)
    assert isinstance(head, str)
    assert len(head) == 40


def test_remote_none_without_origin(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    assert git_service.remote(repo) is None


def test_remote_returns_origin(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    subprocess.run(
        ["git", "-C", str(repo), "remote", "add", "origin", "https://example.com/repo.git"],
        check=True,
        capture_output=True,
    )
    assert git_service.remote(repo) == "https://example.com/repo.git"


def test_ahead_behind_none_without_upstream(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    assert git_service.ahead_behind(repo) == (None, None)


def test_snapshot_clean_repo(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    snap = git_service.snapshot(repo)
    assert snap["branch"] == "main"
    assert snap["modified"] == 0
    assert snap["subject"] == "init"
    assert snap["short_hash"]
    assert len(snap["head"]) == 40
    assert snap["time"]


def test_snapshot_dirty_repo(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    (repo / "README.md").write_text("changed", encoding="utf-8")
    snap = git_service.snapshot(repo)
    assert snap["modified"] >= 1


def test_snapshot_empty_repo_no_commits(tmp_path: Path) -> None:
    repo = tmp_path / "empty"
    repo.mkdir()
    subprocess.run(["git", "init", "-b", "main", str(repo)], check=True, capture_output=True)
    (repo / "a.txt").write_text("x", encoding="utf-8")
    snap = git_service.snapshot(repo)
    assert snap["branch"] == "main"
    assert snap["head"] is None
    assert snap["subject"] is None
    assert snap["modified"] >= 1


def test_missing_repo_raises(tmp_path: Path) -> None:
    try:
        git_service.branch(tmp_path / "does-not-exist")
    except GitError:
        return
    raise AssertionError("expected GitError for a missing repository")