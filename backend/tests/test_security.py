from fastapi.testclient import TestClient

from app.core import config
from app.services import command_service


def _fake_executor() -> tuple[bool, str]:
    return True, "mocked"


def test_bearer_token_enforcement(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(config.settings, "api_token", "secret-token")
    monkeypatch.setattr(command_service, "_EXECUTORS", {"sleep": _fake_executor})

    payload = {"node_id": "macbook-pro", "command": "sleep"}

    # No token -> 401
    assert client.post("/api/v1/commands", json=payload).status_code == 401

    # Wrong token -> 401
    wrong = client.post(
        "/api/v1/commands", json=payload, headers={"Authorization": "Bearer wrong"}
    )
    assert wrong.status_code == 401

    # Correct token -> accepted
    ok = client.post(
        "/api/v1/commands", json=payload, headers={"Authorization": "Bearer secret-token"}
    )
    assert ok.status_code == 201