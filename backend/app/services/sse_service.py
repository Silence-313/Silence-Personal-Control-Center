"""Short-lived SSE tickets.

`EventSource` cannot attach an `Authorization` header, so the frontend first
exchanges its device `access_token` (Bearer) for a temporary ticket via the
`require_access`-gated `/api/v1/auth/sse-ticket` endpoint, then opens the stream
with `?ticket=...`. Tickets are short-lived and are never the long-lived
`access_token`, keeping that token out of URLs and access logs.
"""

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