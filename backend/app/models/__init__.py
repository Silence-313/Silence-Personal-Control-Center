"""SQLModel tables (populated incrementally across Phase 3)."""

from app.automation.models import AutomationRule, AutomationRun
from app.health.models import HealthSnapshot
from app.knowledge.models import KnowledgeItem, Relation
from app.metrics_history.models import MetricSample
from app.models.command import Activity, Command, CommandStatus
from app.models.device import Device, Pairing, PairingStatus
from app.models.node import Node, NodeCapability, NodeStatus
from app.models.session import SessionRecord

__all__ = [
    "Node",
    "NodeCapability",
    "NodeStatus",
    "Command",
    "CommandStatus",
    "Activity",
    "SessionRecord",
    "Device",
    "Pairing",
    "PairingStatus",
    "KnowledgeItem",
    "Relation",
    "AutomationRule",
    "AutomationRun",
    "MetricSample",
    "HealthSnapshot",
]