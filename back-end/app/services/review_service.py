from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project_membership import ProjectMembership
from app.models.task import Task
from app.models.task_review import TaskReview as TaskReviewRecord
from app.models.user import User
from app.schemas.task import TaskSubmission
from app.schemas.review import TaskReview
from app.services.team_service import require_project_role
from app.services.workflow_service import add_audit_event, apply_task_transition


def submit_task(
    db: Session,
    task: Task,
    payload: TaskSubmission,
    actor: User,
    membership: ProjectMembership,
) -> Task:
    if task.assignee_id != actor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned developer can submit work",
        )
    if task.stage != "Active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active tasks can be submitted for review",
        )
    now = datetime.now(timezone.utc)
    task.submitted_at = now
    task.submission_notes = payload.notes
    task.git_reference = payload.git_reference
    task.testing_notes = payload.testing_notes
    apply_task_transition(db, task, "In Review", actor, membership, start_session=False)
    db.commit()
    db.refresh(task)
    return task


def review_task(
    db: Session,
    task: Task,
    payload: TaskReview,
    actor: User,
    membership: ProjectMembership,
) -> Task:
    require_project_role(membership, "owner", "manager", "senior developer", "reviewer")
    if task.stage != "In Review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not awaiting review",
        )
    if payload.result not in {"Approved", "Changes Requested"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid review result")
    if payload.result == "Changes Requested" and not payload.comments.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviewer comments are required",
        )
    if payload.result == "Approved" and actor.id == task.assignee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-approval is not permitted",
        )

    review = TaskReviewRecord(
        task_id=task.id,
        reviewer_id=actor.id,
        result=payload.result,
        comments=payload.comments,
    )
    db.add(review)
    db.flush()
    target_stage = "Completed" if payload.result == "Approved" else "Active"
    apply_task_transition(
        db,
        task,
        target_stage,
        actor,
        membership,
        start_session=False,
    )
    add_audit_event(db, task.id, actor.id, "task.reviewed", None, payload.result)
    db.commit()
    db.refresh(task)
    return task


def list_task_reviews(db: Session, task_id: UUID) -> list[TaskReviewRecord]:
    return db.scalars(
        select(TaskReviewRecord)
        .where(TaskReviewRecord.task_id == task_id)
        .order_by(TaskReviewRecord.created_at)
    ).all()
