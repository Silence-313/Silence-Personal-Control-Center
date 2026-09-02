"""Project registry + git status endpoints (read-only)."""

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import require_access
from app.schemas.project import ProjectOut
from app.services import project_service

router = APIRouter(
    prefix="/api/v1/projects",
    tags=["projects"],
    dependencies=[Depends(require_access)],
)


@router.get("", response_model=list[ProjectOut])
def list_projects() -> list[ProjectOut]:
    return project_service.list_all()


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str) -> ProjectOut:
    project = project_service.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project