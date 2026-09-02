from fastapi.testclient import TestClient


def test_power_status(client: TestClient) -> None:
    response = client.get("/api/v1/nodes/macbook-pro/power")
    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "awake"
    assert body["sleep_supported"] is True  # macOS ships pmset
    # battery is present on a MacBook (this host); may be None on desktops.
    assert "battery" in body
    assert "charging" in body


def test_power_unknown_node_404(client: TestClient) -> None:
    response = client.get("/api/v1/nodes/does-not-exist/power")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"