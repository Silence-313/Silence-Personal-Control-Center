"""Short-lived SSE tickets.

`EventSource` cannot attach an `Authorization` header, so the frontend first
exchanges its device `access_token` (Bearer) for a temporary ticket via the
`require_access`-gated `/api/v1/auth/sse-ticket` endpoint, then opens the stream
with `?ticket=...`. Tickets are short-lived and are never the long-lived
`access_token`, keeping that token out of URLs and access logs.
"""

import asyncio
import logging
import secrets
import threading
import time

logger = logging.getLogger("silence.backend.sse")

SSE_TICKET_TTL_SECONDS = 60


class SseTicketStore:
    """In-memory ticket store.

    Tickets stay valid for their whole TTL (not single-use) so the browser's
    native SSE auto-reconnect can reuse the same URL after a transient drop.
    """

    def __init__(self, ttl_seconds: float = SSE_TICKET_TTL_SECONDS):
        self._ttl = ttl_seconds
        self._tickets: dict[str, float] = {}
        self._lock = threading.Lock()

    def issue(self) -> str:
        token = secrets.token_urlsafe(32)
        now = time.monotonic()
        with self._lock:
            self._tickets[token] = now + self._ttl
        return token

    def validate(self, token: str) -> bool:
        now = time.monotonic()
        with self._lock:
            expires_at = self._tickets.get(token)
            if expires_at is None:
                return False
            if expires_at <= now:
                self._tickets.pop(token, None)
                return False
            return True


sse_tickets = SseTicketStore()


# --- Phase 9: in-process notification pub/sub (no external services) --------
# The automation engine's `notify` action enqueues here; the SSE `event_stream`
# drains the queue every metrics interval. Bound to the running event loop at
# startup via `start_notifications` so sync producers can enqueue thread-safely.

_notify_loop: asyncio.AbstractEventLoop | None = None
_notify_queue: asyncio.Queue | None = None
_event_queue: asyncio.Queue | None = None


def start_notifications() -> None:
    global _notify_loop, _notify_queue, _event_queue
    try:
        _notify_loop = asyncio.get_running_loop()
    except RuntimeError:
        _notify_loop = None
    _notify_queue = asyncio.Queue(maxsize=1000) if _notify_loop is not None else None
    _event_queue = asyncio.Queue(maxsize=1000) if _notify_loop is not None else None


def _enqueue(queue: asyncio.Queue | None, data: dict, label: str) -> bool:
    if queue is None:
        logger.warning("%s dropped: pub/sub not started", label, extra={"data": data})
        return False
    try:
        if _notify_loop is not None and _notify_loop.is_running():
            _notify_loop.call_soon_threadsafe(queue.put_nowait, data)
        else:
            queue.put_nowait(data)
        return True
    except Exception:
        logger.exception("%s enqueue failed", label)
        return False


def publish_notification(data: dict) -> bool:
    """Enqueue a notification; False when the pub/sub is not running (tests)."""
    return _enqueue(_notify_queue, data, "notification")


def publish_automation_event(data: dict) -> bool:
    """Enqueue an automation observability event (best-effort)."""
    return _enqueue(_event_queue, data, "automation event")


async def drain_notifications():
    """Yield all currently-queued notifications without blocking."""
    if _notify_queue is None:
        return
    while True:
        try:
            item = _notify_queue.get_nowait()
        except asyncio.QueueEmpty:
            return
        yield item


async def drain_automation_events():
    """Yield all currently-queued automation events without blocking."""
    if _event_queue is None:
        return
    while True:
        try:
            item = _event_queue.get_nowait()
        except asyncio.QueueEmpty:
            return
        yield item