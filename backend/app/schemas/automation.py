"""Automation rule read-model schema (metadata + execution state)."""

from pydantic import BaseModel


class AutomationRuleOut(BaseModel):
    id: str
    name: str
    enabled: bool
    trigger_type: str
    trigger_value: str | None = None
    actions: list[str] = []
    run_count: int = 0
    last_run_at: str | None = None  # ISO 8601


class AutomationRunOut(BaseModel):
    id: str
    rule_id: str
    trigger: str
    status: str  # success | failed | skipped
    result: dict = {}
    error: str | None = None
    triggered_at: str  # ISO 8601