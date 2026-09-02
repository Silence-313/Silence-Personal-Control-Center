from fastapi.testclient import TestClient


def test_services_shape(client: TestClient) -> None:
    response = client.get("/api/v1/nodes/macbook-pro/services")
    assert response.status_code == 200
    body = response.json()
    docker = body["docker"]
    assert "daemon_running" in docker
    assert "version" in docker
    assert "total" in docker["containers"]
    assert "running" in docker["containers"]
    assert "stopped" in docker["containers"]
    assert isinstance(body["containers"], list)


def test_services_live_docker(client: TestClient) -> None:
    """If the local Docker daemon is up, we must see real containers."""
    body = client.get("/api/v1/nodes/macbook-pro/services").json()
    if body["docker"]["daemon_running"]:
        assert body["docker"]["containers"]["total"] >= 1
        running = sum(1 for c in body["containers"] if c["status"] == "running")
        assert running == body["docker"]["containers"]["running"]


def test_services_unknown_node_404(client: TestClient) -> None:
    response = client.get("/api/v1/nodes/does-not-exist/services")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"