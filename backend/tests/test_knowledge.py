"""Knowledge Plane tests (auto-index + LIKE search + relations)."""

from fastapi.testclient import TestClient

from app.main import app


def _bare() -> TestClient:
    return TestClient(app)


def test_list_knowledge_shapes(client: TestClient) -> None:
    resp = client.get("/api/v1/knowledge")
    assert resp.status_code == 200
    items = resp.json()
    assert items
    types = {i["type"] for i in items}
    for expected in (
        "project",
        "agent",
        "research",
        "paper",
        "dataset",
        "experiment",
        "report",
        "note",
        "session",
    ):
        assert expected in types, f"missing knowledge type {expected}"

    paper = next(i for i in items if i["type"] == "paper")
    assert paper["id"].startswith("paper:")
    assert paper["entity_id"] == paper["id"].split(":", 1)[1]


def test_knowledge_requires_auth() -> None:
    assert _bare().get("/api/v1/knowledge").status_code == 401


def test_filter_by_type(client: TestClient) -> None:
    resp = client.get("/api/v1/knowledge", params={"type": "paper"})
    assert resp.status_code == 200
    items = resp.json()
    assert items and all(i["type"] == "paper" for i in items)
    assert len(items) == 8


def test_search_uses_like(client: TestClient) -> None:
    items = client.get("/api/v1/knowledge", params={"q": "gvhmr"}).json()
    assert any("gvhmr" in i["title"].lower() or "gvhmr" in i["id"].lower() for i in items)


def test_tag_filter(client: TestClient) -> None:
    items = client.get("/api/v1/knowledge", params={"tag": "HMR"}).json()
    assert items
    assert all("HMR" in i["tags"] for i in items)


def test_get_item_and_404(client: TestClient) -> None:
    any_item = client.get("/api/v1/knowledge").json()[0]
    ok = client.get(f"/api/v1/knowledge/{any_item['id']}")
    assert ok.status_code == 200
    assert ok.json()["id"] == any_item["id"]

    missing = client.get("/api/v1/knowledge/unknown:nope")
    assert missing.status_code == 404


def test_relations_endpoint(client: TestClient) -> None:
    resp = client.get("/api/v1/relations/research:research-g1")
    assert resp.status_code == 200
    rels = resp.json()
    belongs = [
        r
        for r in rels
        if r["relation_type"] == "belongs_to" and r["target_id"] == "research:research-g1"
    ]
    assert belongs


def test_relations_accept_bare_id(client: TestClient) -> None:
    # A bare entity id should also resolve (suffix match).
    resp = client.get("/api/v1/relations/research-g1")
    assert resp.status_code == 200
    assert resp.json()