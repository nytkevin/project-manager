from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.dependencies.permissions import get_project_membership, require_project_roles
from app.models.project_membership import ProjectMembership
from app.models.user import User
from app.schemas.task import TaskAssign, TaskCommentCreate, TaskCreate, TaskTransition, TaskUpdate
from app.services.report_service import generate_task_completion_report
from app.services.task_service import (
    add_task_comment,
    assign_task,
    create_task,
    get_task,
    list_project_tasks,
    update_task,
)
from app.services.team_service import require_project_role
from app.services.workflow_service import apply_task_transition
from app.services.report_service import get_project_task_analytics


router = APIRouter(prefix="/projects", tags=["tasks"])


@router.get("/{project_id}/tasks")
def list_tasks(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    return list_project_tasks(db, project_id)


@router.post("/{project_id}/tasks", status_code=status.HTTP_201_CREATED)
def create_task_route(
    project_id: UUID,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: ProjectMembership = Depends(get_project_membership),
):
    require_project_role(membership, "owner", "manager", "developer")
    return create_task(db, project_id, payload, current_user.id)


@router.get("/{project_id}/tasks/{task_id}")
def task_details(
    project_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    return get_task(db, project_id, task_id)


@router.patch("/{project_id}/tasks/{task_id}")
def update_task_route(
    project_id: UUID,
    task_id: UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: ProjectMembership = Depends(get_project_membership),
):
    require_project_role(membership, "owner", "manager", "developer")
    task = get_task(db, project_id, task_id)
    return update_task(db, task, payload.model_dump(exclude_unset=True), current_user.id)


@router.post("/{project_id}/tasks/{task_id}/assign")
def assign_task_route(
    project_id: UUID,
    task_id: UUID,
    payload: TaskAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: ProjectMembership = Depends(require_project_roles("owner", "manager")),
):
    task = get_task(db, project_id, task_id)
    return assign_task(db, task, payload.assignee_id, current_user, membership)


@router.post("/{project_id}/tasks/{task_id}/transition")
def transition_task_route(
    project_id: UUID,
    task_id: UUID,
    payload: TaskTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    apply_task_transition(db, task, payload.stage, current_user, membership)
    db.commit()
    db.refresh(task)
    return task


@router.post("/{project_id}/tasks/{task_id}/comments")
def comment_task(
    project_id: UUID,
    task_id: UUID,
    payload: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    add_task_comment(db, task, current_user.id, payload.body)
    return {"message": "Comment added"}


@router.get("/{project_id}/tasks/{task_id}/report")
def task_report(
    project_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    report = generate_task_completion_report(db, project_id, task)
    return PlainTextResponse(
        report,
        headers={
            "Content-Disposition": f'attachment; filename="{task.display_id}-completion-report.txt"'
        },
    )


@router.get("/{project_id}/analytics")
def project_analytics(
    project_id: UUID,
    start: datetime,
    end: datetime,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    return get_project_task_analytics(db, project_id, start, end)
