"""Research filesystem observer — configured paths only, READ-ONLY.

Rules (Phase 8 absolute rules):

- Only paths that appear in the Research registry are inspected. Absolute
  registry paths are observed as-is; relative registry paths resolve strictly
  inside ``settings.research_base`` (escapes are rejected with an ``error``).
- We only ever ``os.stat`` the exact candidate path — there is no recursion,
  no ``os.walk``/``scandir``, no directory listing, no content read (PDFs are
  never opened).
- Missing / invalid / permission-denied paths degrade to ``missing``/``error``
  and never raise into the API (no 500s from the observer).
- Results are cached in-memory for a short TTL (settings) and never persisted;
  nothing here writes back to the YAML registry.
"""

import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.schemas.research import RuntimeOut

logger = logging.getLogger("silence.backend.research_observer")

# Process-local TTL cache: key -> (observed_monotonic, RuntimeOut).
_cache: dict[tuple[str, str], tuple[float, RuntimeOut]] = {}
# Last observed state per key (used to detect existence flips across TTL
# boundaries) and pending change events to be drained by the API layer.
_previous: dict[tuple[str, str], RuntimeOut] = {}
_pending_changes: list[dict] = []


def resolve_candidate(path_field: str | None) -> tuple[str | None, str | None]:
    """Resolve a registry path value to a single stat-able candidate.

    Returns ``(candidate, error)``. ``candidate=None`` with ``error=None``
    means "missing" (no path or no base configured for a relative path).
    ``error`` is set for invalid/escaping candidates — the caller must NOT
    stat anything in that case.
    """
    if not path_field or not str(path_field).strip():
        return None, None
    raw = str(path_field).strip()
    candidate = Path(raw)
    if candidate.is_absolute():
        # Absolute registry paths are observed as-is (the registry is the
        # allow-list); a bare stat of the exact path is not a scan.
        return str(candidate), None
    base = settings.research_base
    if not base:
        return None, None  # relative path but no base configured → missing
    base_path = Path(base).expanduser().resolve()
    resolved = (base_path / candidate).resolve()
    try:
        resolved.relative_to(base_path)
    except ValueError:
        logger.warning(
            "research path escapes research_base",
            extra={"path": str(candidate), "base": str(base_path)},
        )
        return None, "path escapes research_base"
    return str(resolved), None


def observe_path(
    key: tuple[str, str],
    path_field: str | None,
    *,
    label: str = "",
    research_project_id: str | None = None,
) -> RuntimeOut:
    """Observe one registered entity (TTL-cached, never raises).

    When a registered path flips between exists/missing (compared against the
    last observed state), a ``research`` change event is queued; the API layer
    drains these into the Activity spine via ``drain_changes`` (carrying the
    entity's ``research_project_id``). This keeps association population
    controlled and prevents per-poll spam.
    """
    now = time.monotonic()
    cached = _cache.get(key)
    if cached and now - cached[0] < settings.research_observe_ttl_seconds:
        return cached[1]
    out = _observe_uncached(path_field)
    prev = _previous.get(key)
    _previous[key] = out
    _cache[key] = (now, out)
    if prev is not None and not out.error and prev.exists != out.exists:
        _pending_changes.append(
            {
                "kind": key[0],
                "entity_id": key[1],
                "label": label or key[1],
                "research_project_id": research_project_id,
                "message": f"{label or key[1]} {'appeared' if out.exists else 'disappeared'}",
            }
        )
    return out


def drain_changes(session) -> list:
    """Record queued observation change events into the Activity spine.

    Internal system write path: ``type_="research"``, ``action="observed"``,
    message names the entity, and ``research_project_id`` links the event to
    the research project. Returns the created Activities.
    """
    from app.services import activity_service

    created = []
    for change in _pending_changes:
        act = activity_service.record(
            session,
            type_="research",
            action="observed",
            message=change["message"],
            research_project_id=change["research_project_id"],
        )
        created.append(act)
        logger.info(
            "observation change recorded",
            extra={
                "kind": change["kind"],
                "entity_id": change["entity_id"],
                "activity_id": act.id,
            },
        )
    _pending_changes.clear()
    return created


def _observe_uncached(path_field: str | None) -> RuntimeOut:
    candidate, err = resolve_candidate(path_field)
    if err is not None:
        return RuntimeOut(exists=False, missing=False, error=err)
    if candidate is None:
        return RuntimeOut(exists=False, missing=True)
    try:
        st = os.stat(candidate)
    except FileNotFoundError:
        return RuntimeOut(exists=False, missing=True)
    except PermissionError:
        return RuntimeOut(exists=False, missing=False, error="permission denied")
    except OSError as exc:
        return RuntimeOut(exists=False, missing=False, error=type(exc).__name__)
    return RuntimeOut(
        exists=True,
        missing=False,
        size_bytes=st.st_size,
        modified_at=datetime.fromtimestamp(
            st.st_mtime, tz=timezone.utc
        ).isoformat()
        .replace("+00:00", "Z"),
    )


def clear_cache() -> None:
    """Test hook: drop the in-memory observation cache and pending changes."""
    _cache.clear()
    _previous.clear()
    _pending_changes.clear()