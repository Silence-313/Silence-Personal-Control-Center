"""Command Gateway endpoints (Bearer-authenticated)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.schemas.command import CommandOut, CommandRequest
from app.services import command_service

router = APIRouter(
    prefix="/api/v1/commands",
    tags=["commands"],
    dependencies=[Depends(require_access)],
)


@router.post("", response_model=CommandOut, status_code=201)
def create_command(request: CommandRequest) -> CommandOut:
    return command_service.submit(request)


@router.get("", response_model=list[CommandOut])
def list_commands(session: Session = Depends(get_session)) -> list[CommandOut]:
    return [command_service._to_out(c) for c in command_service.history(session)]


@router.get("/{command_id}", response_model=CommandOut)
def get_command(command_id: str, session: Session = Depends(get_session)) -> CommandOut:
    command = command_service.get(session, command_id)
    if command is None:
        raise HTTPException(status_code=404, detail="Command not found")
    return command_service._to_out(command)