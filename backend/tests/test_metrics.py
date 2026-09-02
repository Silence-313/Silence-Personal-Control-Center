from fastapi.testclient import TestClient


def test_metrics_real_values(client: TestClient) -> None:
    response = client.get("/api/v1/nodes/macbook-pro/metrics")
    assert response.status_code == 200
    body = response.json()
    assert body["memory"]["total_bytes"] > 0
    assert body["disk"]["total_bytes"] > 0
    assert body["uptime_seconds"] > 0
    assert 0 <= body["cpu"]["usage_percent"] <= 100
    assert body["cpu"]["cores"] > 0
    assert "collected_at" in body


def test_metrics_unknown_node_404(client: TestClient) -> None:
    response = client.get("/api/v1/nodes/does-not-exist/metrics")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"