"""Device authorization (pairing + verification + access control) tests."""

from fastapi.testclient import TestClient

from app.main import app
from app.services import device_service, sse_service


def _noop_notify(code: str, device_code: str, label: str) -> None:
    return None


def test_pair_verify_and_access(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(device_service, "_notify_mac", _noop_notify)
    device = "device-abc123"

    pair = client.post(
        "/api/v1/auth/pair", json={"device_code": device, "label": "iPad Safari"}
    )
    assert pair.status_code == 201
    pairing_id = pair.json()["pairing_id"]

    # The Mac-side operator can read the outstanding code (admin endpoint).
    pending = client.get("/api/v1/auth/pending")
    assert pending.status_code == 200
    code = next(
        p["verification_code"]
        for p in pending.json()
        if p["pairing_id"] == pairing_id
    )

    # Not yet authorized.
    assert client.get(f"/api/v1/auth/status?device_code={device}").json()["authorized"] is False

    # Wrong code rejected.
    bad = client.post(
        "/api/v1/auth/verify",
        json={"device_code": device, "verification_code": "000000"},
    )
    assert bad.status_code == 401

    # Correct code issues a per-device access token.
    ok = client.post(
        "/api/v1/auth/verify",
        json={"device_code": device, "verification_code": code},
    )
    assert ok.status_code == 200
    token = ok.json()["access_token"]

    # Now authorized.
    assert client.get(f"/api/v1/auth/status?device_code={device}").json()["authorized"] is True

    # The device token grants access to protected endpoints.
    nodes = client.get("/api/v1/nodes", headers={"Authorization": f"Bearer {token}"})
    assert nodes.status_code == 200


def test_pairing_expiry(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(device_service, "_notify_mac", _noop_notify)
    device = "device-expired"
    pair = client.post("/api/v1/auth/pair", json={"device_code": device})
    pairing_id = pair.json()["pairing_id"]

    from datetime import datetime, timedelta

    from app.db.database import engine
    from app.models.device import Pairing
    from sqlmodel import Session

    with Session(engine) as session:
        p = session.get(Pairing, pairing_id)
        p.expires_at = datetime.now() - timedelta(seconds=1)
        session.add(p)
        session.commit()

    verify = client.post(
        "/api/v1/auth/verify",
        json={"device_code": device, "verification_code": "000000"},
    )
    assert verify.status_code == 410


def test_sse_ticket_flow(client: TestClient) -> None:
    resp = client.get("/api/v1/auth/sse-ticket")
    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["expires_in_seconds"] == sse_service.SSE_TICKET_TTL_SECONDS
    assert sse_service.sse_tickets.validate(body["token"]) is True


def test_protected_endpoints_require_auth() -> None:
    with TestClient(app) as bare:
        assert bare.get("/api/v1/nodes").status_code == 401
        assert bare.get("/api/v1/nodes/macbook-pro/metrics").status_code == 401
        assert bare.get("/api/v1/projects").status_code == 401
        assert bare.get("/api/v1/auth/pending").status_code == 403
        assert bare.get("/api/v1/auth/sse-ticket").status_code == 401