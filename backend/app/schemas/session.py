"""Session Plane read-model schema.

``SessionOut`` deliberately shares the ``AgentSessionOut`` shape so the
agent-scoped endpoint (``GET /api/v1/agents/{id}/sessions``) and the global
Session Plane endpoints (``GET /api/v1/sessions``, ``GET /api/v1/sessions/{id}``)
stay in lock-step; the shape evolves add-only in one place.
"""

from app.schemas.agent import AgentSessionOut

SessionOut = AgentSessionOut