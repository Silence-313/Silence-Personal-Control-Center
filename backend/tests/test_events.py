import asyncio
import json

from fastapi.testclient import TestClient
from starlette.datastructures import QueryParams

from app.api.routes.events import _sse_authorized, event_stream
from app.core import config
from app.services import sse_service


class _FakeClient:
    host = "192.168.0.5"


class _FakeRequest:
    client = _FakeClient()

    def __init__(self, query: str):
        self.query_params = QueryParams(query)


def _event_names(items: list[str]) -> list[str]:
    names = []
    for item in items:
        if item.startswith("event: "):
            names.append(item.split("\n", 1)[0].split(": ", 1)[1])
    return names


def test_event_stream_yields() -> None:
    async def run() -> list[str]:
        gen = event_stream()
        try:
            items = [await anext(gen) for _ in range(3)]
        finally:
            await gen.aclose()
        return items

    names = _event_names(asyncio.run(run()))
    assert "hello" in names
    assert "node_status" in names
    assert "metrics" in names


def test_events_bad_token_rejected(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(config.settings, "api_token", "secret-token")
    response = client.get("/api/v1/events?ticket=wrong")
    assert response.status_code == 401


def test_events_ticket_accepted(client: TestClient) -> None:
    ticket = sse_service.sse_tickets.issue()
    assert _sse_authorized(_FakeRequest(f"ticket={ticket}")) is True
    assert _sse_authorized(_FakeRequest("ticket=wrong")) is False
    assert _sse_authorized(_FakeRequest("")) is False


def test_sse_ticket_store_roundtrip() -> None:
    store = sse_service.SseTicketStore(ttl_seconds=10)
    token = store.issue()
    assert store.validate(token) is True
    assert store.validate("not-a-real-ticket") is False