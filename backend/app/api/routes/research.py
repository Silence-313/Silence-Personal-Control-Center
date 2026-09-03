"""Research registry read-only endpoints (require_access, GET only)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.dependencies import require_access
from app.db.database import get_session
from app.schemas.research import (
    DatasetOut,
    ExperimentOut,
    PaperOut,
    ResearchNoteOut,
    ResearchProjectOut,
    ResearchReportOut,
)
from app.services import research_observer, research_service

router = APIRouter(
    prefix="/api/v1/research",
    tags=["research"],
    dependencies=[Depends(require_access)],
)


@router.get("/projects", response_model=list[ResearchProjectOut])
def list_projects() -> list[ResearchProjectOut]:
    return research_service.list_projects()


@router.get("/projects/{project_id}", response_model=ResearchProjectOut)
def get_project(project_id: str) -> ResearchProjectOut:
    item = research_service.get_project(project_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Research Project not found")
    return item


@router.get("/papers", response_model=list[PaperOut])
def list_papers(session: Session = Depends(get_session)) -> list[PaperOut]:
    items = research_service.list_papers()
    research_observer.drain_changes(session)
    return items


@router.get("/papers/{paper_id}", response_model=PaperOut)
def get_paper(
    paper_id: str, session: Session = Depends(get_session)
) -> PaperOut:
    item = research_service.get_paper(paper_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    research_observer.drain_changes(session)
    return item


@router.get("/datasets", response_model=list[DatasetOut])
def list_datasets(session: Session = Depends(get_session)) -> list[DatasetOut]:
    items = research_service.list_datasets()
    research_observer.drain_changes(session)
    return items


@router.get("/datasets/{dataset_id}", response_model=DatasetOut)
def get_dataset(
    dataset_id: str, session: Session = Depends(get_session)
) -> DatasetOut:
    item = research_service.get_dataset(dataset_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    research_observer.drain_changes(session)
    return item


@router.get("/experiments", response_model=list[ExperimentOut])
def list_experiments(session: Session = Depends(get_session)) -> list[ExperimentOut]:
    items = research_service.list_experiments()
    research_observer.drain_changes(session)
    return items


@router.get("/experiments/{experiment_id}", response_model=ExperimentOut)
def get_experiment(
    experiment_id: str, session: Session = Depends(get_session)
) -> ExperimentOut:
    item = research_service.get_experiment(experiment_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    research_observer.drain_changes(session)
    return item


@router.get("/reports", response_model=list[ResearchReportOut])
def list_reports(session: Session = Depends(get_session)) -> list[ResearchReportOut]:
    items = research_service.list_reports()
    research_observer.drain_changes(session)
    return items


@router.get("/reports/{report_id}", response_model=ResearchReportOut)
def get_report(
    report_id: str, session: Session = Depends(get_session)
) -> ResearchReportOut:
    item = research_service.get_report(report_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Report not found")
    research_observer.drain_changes(session)
    return item


@router.get("/notes", response_model=list[ResearchNoteOut])
def list_notes() -> list[ResearchNoteOut]:
    return research_service.list_notes()


@router.get("/notes/{note_id}", response_model=ResearchNoteOut)
def get_note(note_id: str) -> ResearchNoteOut:
    item = research_service.get_note(note_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return item