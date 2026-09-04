"""Automation rule registry (read model) — parses ``config/automation.yaml``.

Metadata only: rules describe *event → safe action* mappings. Nothing here runs,
and the allowed action set is restricted to ``create_activity`` and ``notify``
(never shell / command / code modification / external webhook).
"""

import logging
from pathlib import Path

import yaml
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger("silence.backend.automation")

TRIGGER_TYPES = frozenset(
    {
        "activity.created",
        "experiment.updated",
        "agent.failed",
        "node.offline",
        "project.changed",
    }
)

ACTION_TYPES = frozenset({"create_activity", "notify"})


class Trigger(BaseModel):
    type: str
    value: str | None = None


class Action(BaseModel):
    type: str
    message: str = ""


class Rule(BaseModel):
    id: str
    name: str = ""
    enabled: bool = True
    trigger: Trigger
    actions: list[Action] = []


_cache: list[Rule] | None = None


def load_rules(force: bool = False) -> list[Rule]:
    global _cache
    if _cache is not None and not force:
        return _cache

    path = Path(settings.automation_config)
    rules: list[Rule] = []
    if not path.exists():
        logger.warning("automation registry not found", extra={"path": str(path)})
        _cache = rules
        return rules

    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError:
        logger.exception("automation registry is not valid YAML", extra={"path": str(path)})
        _cache = []
        return _cache

    for entry in data.get("rules") or []:
        try:
            trigger = Trigger(**((entry.get("trigger") or {})))
            actions = [Action(**a) for a in (entry.get("actions") or []) if isinstance(a, dict)]
            rule = Rule(
                id=str(entry.get("id", "")),
                name=str(entry.get("name", "")),
                enabled=bool(entry.get("enabled", True)),
                trigger=trigger,
                actions=actions,
            )
            if not rule.id or trigger.type not in TRIGGER_TYPES:
                raise ValueError(f"invalid trigger type {trigger.type!r}")
            # Drop unsafe actions silently-visible (log) rather than executing.
            safe = [a for a in rule.actions if a.type in ACTION_TYPES]
            if len(safe) != len(rule.actions):
                logger.warning(
                    "rule contains non-safe action(s); ignored",
                    extra={"rule_id": rule.id, "actions": [a.type for a in rule.actions]},
                )
                rule.actions = safe
            rules.append(rule)
        except Exception as exc:  # noqa: BLE001 — keep the registry resilient
            logger.warning("skipping malformed automation rule", extra={"error": str(exc)})

    _cache = rules
    return rules