"""Automation engine tests: rule matching, safe actions, state, SSE pub/sub."""

import asyncio

import yaml
from fastapi.testclient import TestClient
from sqlmodel import Session as DbSession

from app.automation import engine as automation_engine
from app.automation import rules as automation_rules
from app.automation.models import AutomationRule
from app.core import config
from app.db.database import engine
from app.services import activity_service, sse_service


def test_rules_listed_via_api(client: TestClient) -> None:
    resp = client.get("/api/v1/automation/rules")
    assert resp.status_code == 200
    rules = resp.json()
    ids = {r["id"] for r in rules}
    assert "failed-activity-alert" in ids
    assert "node-offline-alert" in ids
    failed = next(r for r in rules if r["id"] == "failed-activity-alert")
    assert failed["actions"] == ["notify", "create_activity"]


def test_matches() -> None:
    rule = automation_rules.Rule(
        id="r",
        trigger=automation_rules.Trigger(type="activity.created", value="failed"),
    )
    assert automation_engine.matches(rule, {"type": "activity.created", "action": "failed"})
    assert not automation_engine.matches(rule, {"type": "activity.created", "action": "created"})
    assert not automation_engine.matches(rule, {"type": "agent.failed", "action": "failed"})


def test_activity_created_fires_for_failed(client: TestClient) -> None:
    with DbSession(engine) as s:
        activity_service.record(s, type_="test", action="failed", message="boom")

    body = client.get("/api/v1/activities").json()
    assert any(
        a["type"] == "automation" and a["action"] == "rule_failed-activity-alert" for a in body
    )


def test_evaluate_node_offline_updates_state(client: TestClient) -> None:
    with DbSession(engine) as s:
        results = automation_engine.evaluate(
            s, {"type": "node.offline", "entity_id": "macbook-pro", "value": "offline"}
        )
        assert any(r["type"] == "create_activity" and r["ok"] for r in results)
        state = s.get(AutomationRule, "node-offline-alert")
        assert state is not None
        assert state.run_count >= 1


def test_notification_pubsub_roundtrip() -> None:
    async def run() -> list[dict]:
        sse_service.start_notifications()
        assert sse_service.publish_notification({"msg": "hi"}) is True
        await asyncio.sleep(0)  # let the thread-safe put land
        return [item async for item in sse_service.drain_notifications()]

    got = asyncio.run(run())
    assert got == [{"msg": "hi"}]


def test_unsafe_action_dropped(tmp_path) -> None:
    import pathlib

    real = config.settings.automation_config
    p = pathlib.Path(tmp_path) / "automation.yaml"
    p.write_text(
        yaml.safe_dump(
            {
                "rules": [
                    {
                        "id": "evil",
                        "name": "Evil",
                        "enabled": True,
                        "trigger": {"type": "node.offline"},
                        "actions": [
                            {"type": "shell", "message": "rm -rf /"},
                            {"type": "notify", "message": "safe"},
                        ],
                    }
                ]
            },
        ),
        encoding="utf-8",
    )
    try:
        config.settings.automation_config = str(p)
        rules = automation_rules.load_rules(force=True)
        assert len(rules) == 1
        assert [a.type for a in rules[0].actions] == ["notify"]
    finally:
        config.settings.automation_config = real
        automation_rules.load_rules(force=True)