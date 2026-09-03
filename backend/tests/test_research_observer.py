"""Phase 8 Step 6 — Research filesystem observer security & behavior tests.

Proves (using tmp_path only — never touches the real registry or disks):
- exists / missing / error semantics;
- relative paths resolve inside research_base only (escapes rejected, and the
  escaping path is never stat'd);
- permission failures degrade to error, never raise;
- a malicious registry path can never trigger a directory walk of / or home
  (os.walk / os.scandir are never invoked — only a single exact stat);
- short-TTL caching works;
- Research GET responses are enriched with the add-only ``runtime`` object.
"""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import config
from app.services import research_observer


@pytest.fixture(autouse=True)
def _fresh_observer(monkeypatch):
    research_observer.clear_cache()
    monkeypatch.setattr(config.settings, "research_base", None)
    yield


def test_exists_reports_size_and_modified_at(tmp_path: Path) -> None:
    f = tmp_path / "paper.pdf"
    f.write_bytes(b"x" * 42)
    out = research_observer.observe_path(("papers", "p1"), str(f))
    assert out.exists is True
    assert out.missing is False
    assert out.size_bytes == 42
    assert out.modified_at is not None and out.modified_at.endswith("Z")
    assert out.error is None


def test_missing_path(tmp_path: Path) -> None:
    out = research_observer.observe_path(("papers", "p2"), str(tmp_path / "nope.pdf"))
    assert out.exists is False
    assert out.missing is True
    assert out.error is None


def test_none_and_empty_path_are_missing() -> None:
    out = research_observer.observe_path(("experiments", "e1"), None)
    assert out.exists is False and out.missing is True
    out2 = research_observer.observe_path(("experiments", "e2"), "   ")
    assert out2.exists is False and out2.missing is True


def test_relative_path_without_base_is_missing(tmp_path: Path) -> None:
    out = research_observer.observe_path(("reports", "r1"), "reports/x.md")
    assert out.exists is False and out.missing is True


def test_relative_path_resolves_inside_base(tmp_path: Path, monkeypatch) -> None:
    base = tmp_path / "base"
    (base / "reports").mkdir(parents=True)
    (base / "reports" / "x.md").write_text("ok", encoding="utf-8")
    monkeypatch.setattr(config.settings, "research_base", str(base))
    out = research_observer.observe_path(("reports", "r2"), "reports/x.md")
    assert out.exists is True
    assert out.size_bytes == 2


def test_relative_path_escape_is_rejected_without_stat(
    tmp_path: Path, monkeypatch
) -> None:
    base = tmp_path / "base"
    base.mkdir()
    monkeypatch.setattr(config.settings, "research_base", str(base))

    calls: list[str] = []
    real_stat = os.stat

    def spy(path, **kwargs):
        calls.append(str(path))
        return real_stat(path, **kwargs)

    monkeypatch.setattr(research_observer.os, "stat", spy)
    out = research_observer.observe_path(("datasets", "d1"), "../../etc/passwd")
    assert out.error == "path escapes research_base"
    assert out.exists is False
    assert calls == []  # the escaping path was never touched


def test_permission_error_degrades_to_error(tmp_path: Path, monkeypatch) -> None:
    def boom(path, **kwargs):
        raise PermissionError("nope")

    monkeypatch.setattr(research_observer.os, "stat", boom)
    out = research_observer.observe_path(("papers", "p3"), str(tmp_path / "x.pdf"))
    assert out.exists is False
    assert out.missing is False
    assert out.error == "permission denied"


def test_registry_path_cannot_trigger_directory_walk(tmp_path: Path, monkeypatch) -> None:
    # A malicious registry entry pointing at "/" (or home) must only ever be a
    # single stat — never a recursive walk or directory listing.
    def forbidden(*args, **kwargs):
        raise AssertionError("directory walk must never be triggered")

    monkeypatch.setattr(research_observer.os, "walk", forbidden)
    monkeypatch.setattr(research_observer.os, "scandir", forbidden)

    out = research_observer.observe_path(("datasets", "d-root"), "/")
    assert out.exists is True  # single stat of "/" is allowed
    out_home = research_observer.observe_path(("datasets", "d-home"), str(Path.home()))
    assert out_home.exists is True


def test_short_ttl_cache(tmp_path: Path, monkeypatch) -> None:
    f = tmp_path / "cached.bin"
    f.write_bytes(b"z")
    counted = {"n": 0}
    real_stat = os.stat

    def spy(path, **kwargs):
        counted["n"] += 1
        return real_stat(path, **kwargs)

    monkeypatch.setattr(research_observer.os, "stat", spy)
    monkeypatch.setattr(config.settings, "research_observe_ttl_seconds", 30)

    research_observer.observe_path(("papers", "pc"), str(f))
    research_observer.observe_path(("papers", "pc"), str(f))
    assert counted["n"] == 1  # cached within TTL

    monkeypatch.setattr(config.settings, "research_observe_ttl_seconds", -1)
    research_observer.observe_path(("papers", "pc"), str(f))
    assert counted["n"] == 2  # TTL expired → re-observed


def test_research_endpoints_enriched_with_runtime(client: TestClient) -> None:
    # Real registry: relative paper/report paths → missing (no base); dataset
    # absolute paths under /Volumes → missing (absent on this host).
    papers = client.get("/api/v1/research/papers").json()
    assert papers
    assert all("runtime" in p for p in papers)
    assert all(p["runtime"]["missing"] is True for p in papers)

    detail = client.get("/api/v1/research/papers/paper-gvhmr").json()
    assert detail["runtime"]["missing"] is True

    exps = client.get("/api/v1/research/experiments").json()
    assert exps
    assert all("runtime" in e for e in exps)
    assert all(e["runtime"]["missing"] is True for e in exps)  # artifact_path null


def test_observation_flip_records_associated_activity(
    tmp_path: Path, monkeypatch
) -> None:
    from sqlmodel import Session as DbSession
    from sqlmodel import SQLModel, create_engine, select

    from app.models.command import Activity

    engine = create_engine(f"sqlite:///{tmp_path / 'flip.db'}")
    SQLModel.metadata.create_all(engine)

    f = tmp_path / "flip.pdf"
    f.write_bytes(b"x")

    with DbSession(engine) as db_session:
        # baseline: file exists, no previous state → no change queued
        research_observer.observe_path(
            ("papers", "flip"),
            str(f),
            label="Flip Paper",
            research_project_id="rp1",
        )
        assert research_observer.drain_changes(db_session) == []

        # flip: file removed + TTL expired → change queued
        f.unlink()
        monkeypatch.setattr(config.settings, "research_observe_ttl_seconds", -1)
        out = research_observer.observe_path(
            ("papers", "flip"),
            str(f),
            label="Flip Paper",
            research_project_id="rp1",
        )
        assert out.missing is True

        created = research_observer.drain_changes(db_session)
        assert len(created) == 1
        assert created[0].type == "research"
        assert created[0].action == "observed"
        assert created[0].research_project_id == "rp1"
        assert "disappeared" in created[0].message

        # second drain is empty (idempotent drain)
        assert research_observer.drain_changes(db_session) == []

        row = db_session.exec(select(Activity)).one()
        assert row.research_project_id == "rp1"