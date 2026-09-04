"""Automation engine: lightweight event matching → safe actions only.

The engine is event-driven: producers hand it a normalized ``event`` dict and it
runs every enabled, matching rule, executing only ``create_activity`` (through
the Activity spine) and ``notify`` (through the in-process SSE queue). It also
mirrors per-rule execution state into the ``automation_rules`` table.

``activity.created`` is wired live from ``activity_service.record`` (automation-
originated activities are excluded to prevent loops). The remaining triggers are
fully matchable and unit-tested but have no production emitter in v1 (static
registries; the heartbeat loop has no offline detector) — documented in the
Phase 9 report.
"""

import logging
from datetime import datetime
from uuid import uuid4

from sqlmodel import Session, select

from app.automation.models import AutomationRule, AutomationRun
from app.automation.rules import Action, Rule, load_rules
from app.schemas.automation import AutomationRuleOut, AutomationRunOut
from app.services import activity_service, sse_service

logger = logging.getLogger("silence.backend.automation")


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:
        return "{" + key + "}"


def _render(template: str, rule: Rule, event: dict) -> str:
    data = {
        "rule": rule.id,
        "rule_id": rule.id,
        "type": event.get("type", ""),
        "entity_id": event.get("entity_id", ""),
        "id": event.get("entity_id", event.get("id", "")),
        "value": event.get("value", ""),
        "action": event.get("action", ""),
        "status": event.get("status", ""),
        "message": event.get("message", ""),
    }
    try:
        return template.format_map(_SafeDict(data))
    except Exception:  # noqa: BLE001 — never let a template abort the engine
        return template


def matches(rule: Rule, event: dict) -> bool:
    if rule.trigger.type != event.get("type"):
        return False
    if rule.trigger.value:
        candidates = {event.get("value"), event.get("action"), event.get("status")}
        if rule.trigger.value not in candidates:
            return False
    return True


def _get_or_create_state(
    session: Session, rule_id: str, name: str, enabled: bool
) -> AutomationRule:
    state = session.get(AutomationRule, rule_id)
    if state is None:
        state = AutomationRule(id=rule_id, name=name, enabled=enabled)
        session.add(state)
    else:
        state.name = name
        state.enabled = enabled
    return state


def _run_action(session: Session, rule: Rule, action: Action, event: dict) -> dict:
    message = _render(action.message, rule, event)
    if action.type == "create_activity":
        activity_service.record(
            session, type_="automation", action=f"rule_{rule.id}", message=message
        )
        return {"type": "create_activity", "ok": True}
    if action.type == "notify":
        return {"type": "notify", "ok": sse_service.publish_notification({"rule": rule.id, "message": message})}
    return {"type": action.type, "ok": False}


def _record_run(
    session: Session,
    *,
    rule: Rule,
    status: str,
    result: dict,
    error: str | None = None,
) -> AutomationRun:
    run = AutomationRun(
        id=uuid4().hex[:12],
        rule_id=rule.id,
        trigger=rule.trigger.type,
        status=status,
        result=result,
        error=error,
        triggered_at=datetime.now(),
    )
    session.add(run)
    return run


def evaluate(session: Session, event: dict) -> list[dict]:
    results: list[dict] = []
    event_type = event.get("type", "")
    for rule in load_rules():
        if not rule.enabled:
            continue
        if not matches(rule, event):
            # Near-miss (same trigger type, value mismatch) → recorded "skipped".
            if rule.trigger.type == event_type:
                _record_run(session, rule=rule, status="skipped", result={})
            continue
        state = _get_or_create_state(session, rule.id, rule.name, rule.enabled)
        state.last_matched_at = datetime.now()
        action_results: list[dict] = []
        for action in rule.actions:
            action_results.append(_run_action(session, rule, action, event))
        results.extend(action_results)
        ok = all(r.get("ok") for r in action_results)
        status = "success" if ok else "failed"
        error = (
            "; ".join(
                f"{r.get('type')}: {r.get('error', 'not ok')}"
                for r in action_results
                if not r.get("ok")
            )
            or None
        )
        _record_run(session, rule=rule, status=status, result={"actions": action_results}, error=error)
        sse_service.publish_automation_event(
            {
                "rule_id": rule.id,
                "status": status,
                "trigger": rule.trigger.type,
                "triggered_at": datetime.now().isoformat(),
                "error": error,
            }
        )
        state.last_run_at = datetime.now()
        state.run_count += 1
        session.add(state)
    session.commit()
    return results


def on_activity_created(session: Session, activity) -> None:
    """``activity.created`` emitter. Automation-originated activities are
    excluded so a rule that emits ``create_activity`` cannot trigger itself."""
    if getattr(activity, "type", None) == "automation":
        return
    evaluate(
        session,
        {
            "type": "activity.created",
            "entity_id": activity.id,
            "id": activity.id,
            "action": activity.action,
            "value": activity.action,
            "message": activity.message,
        },
    )


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() + "Z" if dt else None


def _to_out(rule: Rule, state: AutomationRule) -> AutomationRuleOut:
    return AutomationRuleOut(
        id=rule.id,
        name=rule.name,
        enabled=rule.enabled,
        trigger_type=rule.trigger.type,
        trigger_value=rule.trigger.value,
        actions=[a.type for a in rule.actions],
        run_count=state.run_count,
        last_run_at=_iso(state.last_run_at),
    )


def sync_state(session: Session) -> list[AutomationRuleOut]:
    """Ensure every YAML rule has a state row and return the joined list."""
    outs = [_to_out(rule, _get_or_create_state(session, rule.id, rule.name, rule.enabled)) for rule in load_rules()]
    session.commit()
    return outs


def _run_out(run: AutomationRun) -> AutomationRunOut:
    return AutomationRunOut(
        id=run.id,
        rule_id=run.rule_id,
        trigger=run.trigger,
        status=run.status,
        result=run.result or {},
        error=run.error,
        triggered_at=run.triggered_at.isoformat() + "Z" if run.triggered_at else "",
    )


def list_runs(session: Session, limit: int = 50) -> list[AutomationRunOut]:
    """Execution history, newest-first."""
    rows = session.exec(
        select(AutomationRun).order_by(AutomationRun.triggered_at.desc()).limit(limit)
    ).all()
    return [_run_out(r) for r in rows]