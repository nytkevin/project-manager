from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.dependencies.permissions import get_project_membership
from app.models.project_membership import ProjectMembership
from app.models.user import User
from app.schemas.work_session import WorkSessionSummary
from app.services.task_service import get_task
from app.services.time_tracking_service import (
    active_work_seconds,
    list_task_work_sessions,
    start_work_session,
    stop_work_session,
)
from app.services.workflow_service import apply_task_transition


router = APIRouter(prefix="/projects", tags=["work sessions"])


@router.post("/{project_id}/tasks/{task_id}/work-sessions")
def start_work(
    project_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    if task.stage == "Ready":
        apply_task_transition(db, task, "Active", current_user, membership)
    session = start_work_session(db, task, current_user.id)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{project_id}/tasks/{task_id}/work-sessions/stop")
def stop_work(
    project_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    return stop_work_session(db, task, current_user.id)


@router.get(
    "/{project_id}/tasks/{task_id}/work-sessions",
    response_model=WorkSessionSummary,
)
def task_work_sessions(
    project_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    sessions = list_task_work_sessions(db, task.id)
    return {
        "active_seconds": active_work_seconds(sessions),
        "sessions": sessions,
    }
