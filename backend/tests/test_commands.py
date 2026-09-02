from fastapi.testclient import TestClient

from app.services import command_service


def _fake_executor() -> tuple[bool, str]:
    return True, "mocked"


def test_sleep_allowed(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(command_service, "_EXECUTORS", {"sleep": _fake_executor})
    response = client.post(
        "/api/v1/commands", json={"node_id": "macbook-pro", "command": "sleep"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["command"] == "sleep"
    assert body["status"] == "success"
    assert body["id"]


def test_wake_allowed(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(command_service, "_EXECUTORS", {"wake": _fake_executor})
    response = client.post(
        "/api/v1/commands", json={"node_id": "macbook-pro", "command": "wake"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["command"] == "wake"
    assert body["status"] == "success"
    assert body["id"]


def test_shutdown_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/commands", json={"node_id": "macbook-pro", "command": "shutdown"}
    )
    assert response.status_code == 403
    assert response.json()["error"] == {
        "code": "COMMAND_NOT_ALLOWED",
        "message": "Command is not allowed for this node.",
    }


def test_arbitrary_shell_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/commands",
        json={"node_id": "macbook-pro", "command": "shell", "target": "rm -rf /"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "COMMAND_NOT_ALLOWED"


def test_invalid_node_rejected(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(command_service, "_EXECUTORS", {"sleep": _fake_executor})
    response = client.post(
        "/api/v1/commands", json={"node_id": "does-not-exist", "command": "sleep"}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_command_history_and_activity(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(command_service, "_EXECUTORS", {"sleep": _fake_executor})
    client.post("/api/v1/commands", json={"node_id": "macbook-pro", "command": "sleep"})

    history = client.get("/api/v1/commands").json()
    assert any(c["command"] == "sleep" for c in history)

    activities = client.get("/api/v1/activities").json()
    assert any(a["action"] == "sleep_requested" for a in activities)