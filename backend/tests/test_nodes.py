from fastapi.testclient import TestClient


def test_list_nodes(client: TestClient) -> None:
    response = client.get("/api/v1/nodes")
    assert response.status_code == 200
    nodes = response.json()
    assert isinstance(nodes, list)
    assert len(nodes) >= 1
    local = next(n for n in nodes if n["id"] == "macbook-pro")
    assert local["status"] == "online"
    for cap in ("system_metrics", "docker_read", "git_read", "power_read", "power_sleep"):
        assert cap in local["capabilities"]


def test_get_node(client: TestClient) -> None:
    response = client.get("/api/v1/nodes/macbook-pro")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "macbook-pro"
    assert body["platform"] == "macos"
    assert body["architecture"] in {"arm64", "x86_64"}
    assert "last_seen" in body
    # Real hardware enrichment (read-only) is present.
    assert body["hardware"]["chip"]
    assert body["hardware"]["cpu_cores"] > 0
    assert body["hardware"]["memory_gb"] > 0
    assert "model" in body
    assert "ip" in body


def test_get_unknown_node_uniform_404(client: TestClient) -> None:
    response = client.get("/api/v1/nodes/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert body == {"error": {"code": "NOT_FOUND", "message": "Node not found"}}