"""Server-Sent Events stream (metrics + node status).

v0.1 pushes periodic `node_status` and `metrics` events; activity/command_status
events can be added on the same stream later. `EventSource` cannot send custom
headers, so it authenticates via a short-lived `?ticket=` issued at
`/api/v1/auth/sse-ticket` (admin API token also accepted for headless use).
"""

import asyncio
import hmac
import json
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.db.database import engine
from app.models.node import Node
from app.services import metrics_service, node_service, sse_service

router = APIRouter(tags=["events"])

_METRICS_INTERVAL = 5.0
_HEARTBEAT_INTERVAL = 10.0

_LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}


def _sse_authorized(request: Request) -> bool:
    """Mirror `require_access` but read the credential from the query string.

    EventSource cannot send headers, so the accepted credential is the
    short-lived `?ticket=` (never the long-lived access_token). The admin API
    token is also accepted for headless/Mac-side use. Localhost is trusted the
    same way as the REST endpoints.
    """
    host = request.client.host if request.client else "unknown"
    if host in _LOCAL_HOSTS:
        return True
    token = request.query_params.get("ticket") or request.query_params.get("token")
    if not token:
        return False
    if settings.api_token and hmac.compare_digest(token, settings.api_token):
        return True
    return sse_service.sse_tickets.validate(token)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


def _node_status() -> dict:
    with Session(engine) as session:
        node = session.get(Node, settings.node_id)
        if node is None:
            return {"id": settings.node_id, "status": "offline"}
        return {
            "id": node.id,
            "name": node.name,
            "status": node_service.computed_status(node.last_seen),
            "last_seen": node.last_seen.isoformat(),
        }


async def event_stream():
    yield _sse("hello", {"time": datetime.now().isoformat()})
    yield _sse("node_status", _node_status())
    metrics = await run_in_threadpool(metrics_service.collect)
    yield _sse("metrics", metrics.model_dump(mode="json"))

    ticks = 0
    while True:
        await asyncio.sleep(_METRICS_INTERVAL)
        metrics = await run_in_threadpool(metrics_service.collect)
        yield _sse("metrics", metrics.model_dump(mode="json"))
        ticks += 1
        if ticks * _METRICS_INTERVAL >= _HEARTBEAT_INTERVAL:
            yield _sse("node_status", _node_status())
            ticks = 0


@router.get("/api/v1/events")
async def stream_events(request: Request) -> StreamingResponse:
    if not _sse_authorized(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )