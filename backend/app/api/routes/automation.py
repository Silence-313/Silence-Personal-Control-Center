"""Automation endpoints (READ-ONLY registry listing, require_access).

The rule *definitions* are read from ``config/automation.yaml``; this endpoint
returns them joined with their per-rule execution state. No rule mutation is
exposed — automation is authored in YAML only.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.dependencies import require_access
from app.automation import engine as automation_engine
from app.db.database import get_session
from app.schemas.automation import AutomationRuleOut, AutomationRunOut

router = APIRouter(
    prefix="/api/v1/automation",
    tags=["automation"],
    dependencies=[Depends(require_access)],
)


@router.get("/rules", response_model=list[AutomationRuleOut])
def list_automation_rules(
    session: Session = Depends(get_session),
) -> list[AutomationRuleOut]:
    return automation_engine.sync_state(session)


@router.get("/runs", response_model=list[AutomationRunOut])
def list_automation_runs(
    limit: int = 50,
    session: Session = Depends(get_session),
) -> list[AutomationRunOut]:
    return automation_engine.list_runs(session, limit=limit)