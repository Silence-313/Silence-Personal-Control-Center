"""Automation rule execution state (SQLite).

Rule *definitions* (trigger + actions) live in ``config/automation.yaml`` — the
single source of truth and a read model, exactly like the agent/research
registries. This table only tracks runtime execution state so repeated rule runs
can be observed without duplicating rule definitions into SQLite.
"""

from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class AutomationRule(SQLModel, table=True):
    __tablename__ = "automation_rules"

    id: str = Field(primary_key=True)  # rule id from automation.yaml
    name: str = ""
    enabled: bool = True
    last_matched_at: datetime | None = None
    last_run_at: datetime | None = None
    run_count: int = 0


class AutomationRun(SQLModel, table=True):
    """Per-evaluation execution record (Phase 10 Step 5 observability)."""

    __tablename__ = "automation_runs"

    id: str = Field(primary_key=True)
    rule_id: str = Field(index=True)
    trigger: str = ""  # trigger type (e.g. "activity.created")
    status: str = "success"  # success | failed | skipped
    result: dict = Field(default_factory=dict, sa_column=Column(JSON))
    error: str | None = None
    triggered_at: datetime = Field(default_factory=datetime.now, index=True)