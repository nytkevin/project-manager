from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.dependencies.permissions import get_project_membership
from app.models.project_membership import ProjectMembership
from app.models.user import User
from app.schemas.review import TaskReview, TaskReviewResponse
from app.schemas.task import TaskSubmission
from app.services.review_service import list_task_reviews, review_task, submit_task
from app.services.task_service import get_task


router = APIRouter(prefix="/projects", tags=["reviews"])


@router.post("/{project_id}/tasks/{task_id}/submit")
def submit_task_route(
    project_id: UUID,
    task_id: UUID,
    payload: TaskSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    return submit_task(db, task, payload, current_user, membership)


@router.post("/{project_id}/tasks/{task_id}/reviews")
def review_task_route(
    project_id: UUID,
    task_id: UUID,
    payload: TaskReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    return review_task(db, task, payload, current_user, membership)


@router.get(
    "/{project_id}/tasks/{task_id}/reviews",
    response_model=list[TaskReviewResponse],
)
def review_history(
    project_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    task = get_task(db, project_id, task_id)
    return list_task_reviews(db, task.id)
