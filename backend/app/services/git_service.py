"""Read-only git status reader.

Every invocation is a hard-coded read-only `git` subcommand
(`status --porcelain`, `branch --show-current`, `log -1`, `rev-parse`,
`remote get-url`). No mutating git subcommand exists in this module, and no
arbitrary arguments or user-supplied paths are accepted — the caller passes a
`Path` already resolved from the trusted project registry.
"""

import logging
import re
import subprocess
from pathlib import Path

logger = logging.getLogger("silence.backend.git")


class GitError(RuntimeError):
    pass


def _run(path: Path, args: list[str]) -> str:
    try:
        proc = subprocess.run(
            ["git", "-C", str(path), *args],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except FileNotFoundError as exc:
        raise GitError("git executable not found") from exc
    except subprocess.TimeoutExpired as exc:
        raise GitError("git command timed out") from exc
    if proc.returncode != 0:
        raise GitError((proc.stderr or "git command failed").strip())
    return proc.stdout


def branch(path: Path) -> str:
    return _run(path, ["branch", "--show-current"]).strip()


def porcelain(path: Path) -> str:
    return _run(path, ["status", "--porcelain"])


def last_commit_hash(path: Path) -> str:
    return _run(path, ["log", "-1", "--format=%h"]).strip()


def last_commit_subject(path: Path) -> str:
    return _run(path, ["log", "-1", "--format=%s"]).strip()


def last_commit_time(path: Path) -> str:
    return _run(path, ["log", "-1", "--format=%cI"]).strip()


def head(path: Path) -> str:
    """Full (40-char) HEAD sha via `git rev-parse HEAD`."""
    return _run(path, ["rev-parse", "HEAD"]).strip()


def remote(path: Path) -> str | None:
    """`git remote get-url origin`, or None when there is no origin."""
    try:
        return _run(path, ["remote", "get-url", "origin"]).strip() or None
    except GitError:
        return None


def _parse_ahead_behind(first_line: str) -> tuple[int | None, int | None]:
    """Parse the `## <branch>...[upstream] [ahead N, behind M]` status line.

    Returns ``(ahead, behind)``; each is None when absent.
    """
    ahead: int | None = None
    behind: int | None = None
    bracket = re.search(r"\[([^\]]*)\]", first_line)
    if not bracket:
        return ahead, behind
    for part in bracket.group(1).split(","):
        part = part.strip()
        try:
            if part.startswith("ahead "):
                ahead = int(part.split()[1])
            elif part.startswith("behind "):
                behind = int(part.split()[1])
        except (IndexError, ValueError):
            continue
    return ahead, behind


def ahead_behind(path: Path) -> tuple[int | None, int | None]:
    first = _run(path, ["status", "--porcelain=v1", "--branch"]).split("\n", 1)[0]
    return _parse_ahead_behind(first)


def snapshot(path: Path) -> dict:
    """One-pass read of branch / ahead / behind / modified / head / last commit.

    Uses two subprocesses (``status --porcelain=v1 --branch`` and
    ``log -1``) instead of one per field. The ``status`` failure raises
    (corrupted repo / git missing); a missing ``log`` (empty repo, no commits)
    leaves the commit fields as None.
    """
    result: dict = {
        "branch": None,
        "ahead": None,
        "behind": None,
        "modified": 0,
        "head": None,
        "short_hash": None,
        "subject": None,
        "time": None,
    }

    status = _run(path, ["status", "--porcelain=v1", "--branch"])
    lines = [line for line in status.splitlines() if line.strip()]
    if lines:
        first = lines[0]
        text = first.lstrip("#").strip()
        if text.startswith("No commits yet on "):
            result["branch"] = text[len("No commits yet on ") :].strip() or None
        else:
            result["branch"] = text.split("...", 1)[0].strip() or None
        result["ahead"], result["behind"] = _parse_ahead_behind(first)
        result["modified"] = sum(
            1 for line in lines[1:] if not line.lstrip().startswith("#")
        )

    try:
        log = _run(path, ["log", "-1", "--format=%H%x00%h%x00%s%x00%cI"])
        parts = log.strip("\n").split("\x00")
        if len(parts) >= 4:
            result["head"] = parts[0] or None
            result["short_hash"] = parts[1] or None
            result["subject"] = parts[2] or None
            result["time"] = parts[3] or None
    except GitError:
        # No commits yet — commit fields stay None.
        pass

    return result