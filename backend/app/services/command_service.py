"""Command Gateway: schema → allowlist → capability → execute → audit.

Only `sleep` (screen sleep) and `wake` (display wake) are allowlisted in v0.1.
Sleep turns the display off but keeps the API reachable, so the iPad can wake
the screen back later.
"""

import logging
import threading
import time
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlmodel import Session, select

from app.core.errors import ApiError
from app.db.database import engine
from app.models.command import Command, CommandStatus
from app.models.node import Node, NodeCapability
from app.schemas.command import CommandOut, CommandRequest
from app.services import activity_service, power_service

logger = logging.getLogger("silence.backend.command")

# command -> required node capability
ALLOWED_COMMANDS: dict[str, NodeCapability] = {
    "sleep": NodeCapability.POWER_SLEEP,
    "wake": NodeCapability.POWER_SLEEP,
}


def _sleep_executor() -> tuple[bool, str]:
    """Turn the display off shortly after the API ack so the response flushes."""

    def _run() -> None:
        time.sleep(1.0)
        ok, message = power_service.sleep()
        if not ok:
            logger.error("sleep failed", extra={"error": message})

    threading.Thread(target=_run, daemon=True).start()
    return True, "sleep scheduled"


def _wake_executor() -> tuple[bool, str]:
    """Wake the display immediately (the host never fully sleeps)."""
    ok, message = power_service.wake()
    if not ok:
        logger.error("wake failed", extra={"error": message})
    return ok, "wake initiated" if ok else message


# Module-level executors, monkeypatchable in tests to avoid touching power state.
_EXECUTORS: dict[str, object] = {"sleep": _sleep_executor, "wake": _wake_executor}


def _to_out(command: Command) -> CommandOut:
    return CommandOut(
        id=command.id,
        node_id=command.node_id,
        command=command.command,
        status=command.status,
        requested_at=command.requested_at,
        result=command.result,
    )


def submit(request: CommandRequest, requested_by: str = "local-user") -> CommandOut:
    command_id = uuid4().hex[:12]
    logger.info(
        "COMMAND_REQUEST",
        extra={
            "command_id": command_id,
            "node_id": request.node_id,
            "command": request.command,
            "requested_by": requested_by,
        },
    )

    with Session(engine) as session:
        node = session.get(Node, request.node_id)
        if node is None:
            raise HTTPException(status_code=404, detail="Node not found")

        capability = ALLOWED_COMMANDS.get(request.command)
        if capability is None:
            logger.warning(
                "COMMAND_REJECTED",
                extra={"command_id": command_id, "reason": "not_allowlisted", "command": request.command},
            )
            raise ApiError(403, "COMMAND_NOT_ALLOWED", "Command is not allowed for this node.")
        if capability.value not in (node.capabilities or []):
            logger.warning(
                "COMMAND_REJECTED",
                extra={"command_id": command_id, "reason": "capability_missing", "command": request.command},
            )
            raise ApiError(403, "CAPABILITY_NOT_SUPPORTED", "Node does not support this command.")

        command = Command(
            id=command_id,
            node_id=request.node_id,
            command=request.command,
            target=request.target,
            status=CommandStatus.QUEUED.value,
            requested_by=requested_by,
        )
        session.add(command)
        session.commit()
        session.refresh(command)
        logger.info(
            "COMMAND_ACCEPTED",
            extra={"command_id": command_id, "command": request.command, "node_id": request.node_id},
        )

        command.status = CommandStatus.RUNNING.value
        command.started_at = datetime.now()
        session.add(command)
        session.commit()
        logger.info("COMMAND_STARTED", extra={"command_id": command_id, "command": request.command})

        executor = _EXECUTORS[request.command]
        ok, result = executor()  # type: ignore[misc]

        if ok:
            command.status = CommandStatus.SUCCESS.value
            command.result = result or "ok"
            logger.info("COMMAND_SUCCESS", extra={"command_id": command_id, "command": request.command})
        else:
            command.status = CommandStatus.FAILED.value
            command.result = result
            logger.error(
                "COMMAND_FAILED",
                extra={"command_id": command_id, "command": request.command, "error": result},
            )
        command.finished_at = datetime.now()
        session.add(command)
        session.commit()
        session.refresh(command)

        activity_service.record(
            session,
            type_="command",
            action=f"{request.command}_requested",
            message=f"{request.command.capitalize()} requested for {node.name}",
            node_id=node.id,
            command_id=command_id,
        )

        return _to_out(command)


def history(session: Session, limit: int = 50) -> list[Command]:
    return list(
        session.exec(
            select(Command).order_by(Command.requested_at.desc()).limit(limit)
        ).all()
    )


def get(session: Session, command_id: str) -> Command | None:
    return session.get(Command, command_id)