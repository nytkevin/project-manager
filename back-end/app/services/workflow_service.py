from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent
from app.models.project_membership import ProjectMembership
from app.models.task import Task
from app.models.task_review import TaskReview
from app.models.user import User
from app.services.team_service import require_project_role
from app.services.time_tracking_service import start_work_session, stop_active_work_session


STAGES = {"Backlog", "Assigned", "Ready", "Active", "In Review", "Completed"}
ALLOWED_TRANSITIONS = {
    "Backlog": {"Assigned"},
    "Assigned": {"Ready"},
    "Ready": {"Active"},
    "Active": {"In Review"},
    "In Review": {"Active", "Completed"},
    "Completed": set(),
}


def add_audit_event(
    db: Session,
    task_id: UUID,
    actor_id: UUID,
    action: str,
    previous: str | None = None,
    new: str | None = None,
) -> None:
    db.add(
        AuditEvent(
            task_id=task_id,
            actor_id=actor_id,
            action=action,
            previous_value=previous,
            new_value=new,
        )
    )


def apply_task_transition(
    db: Session,
    task: Task,
    target_stage: str,
    actor: User,
    membership: ProjectMembership,
    *,
    start_session: bool = True,
) -> None:
    if target_stage not in STAGES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid workflow stage")
    if target_stage not in ALLOWED_TRANSITIONS.get(task.stage, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task cannot move from {task.stage} to {target_stage}",
        )

    if target_stage == "Assigned":
        require_project_role(membership, "owner", "manager")
        if task.assignee_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task must have an assignee")
    elif target_stage == "Ready":
        require_project_role(membership, "owner", "manager")
        if (
            task.assignee_id is None
            or len(task.description.strip()) < 20
            or len(task.acceptance_criteria.strip()) < 10
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Description, acceptance criteria, and assignee are required",
            )
    elif target_stage == "Active":
        if task.stage == "In Review":
            if start_session:
                require_project_role(membership, "owner", "manager", "developer")
                if task.assignee_id != actor.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Only the assigned developer can restart work",
                    )
            else:
                require_project_role(membership, "owner", "manager", "senior developer", "reviewer")
        else:
            require_project_role(membership, "owner", "manager", "developer")
            if task.assignee_id != actor.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the assigned developer can start work",
                )
    elif target_stage == "In Review":
        if task.assignee_id != actor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned developer can submit work",
            )
        if task.submitted_at is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Work submission is required",
            )
    elif target_stage == "Completed":
        require_project_role(membership, "owner", "manager", "senior developer", "reviewer")
        approved = db.scalar(
            select(TaskReview).where(
                TaskReview.task_id == task.id,
                TaskReview.result == "Approved",
            )
        )
        if approved is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An approved review is required",
            )
        if approved.reviewer_id == task.assignee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Self-approval is not permitted",
            )

    now = datetime.now(timezone.utc)
    previous_stage = task.stage
    if task.stage == "Active" and target_stage != "Active":
        stop_active_work_session(db, task, actor.id)
    if target_stage == "Active" and start_session:
        task.stage = target_stage
        start_work_session(db, task, actor.id)
    else:
        task.stage = target_stage
    task.last_activity_at = now
    if target_stage == "Completed":
        task.completed_at = now
        approved_review = db.scalar(
            select(TaskReview).where(
                TaskReview.task_id == task.id,
                TaskReview.result == "Approved",
            )
        )
        task.approved_by = approved_review.reviewer_id if approved_review else None
    elif target_stage == "Active":
        task.completed_at = None
        task.approved_by = None

    add_audit_event(
        db,
        task.id,
        actor.id,
        "task.stage_changed",
        previous_stage,
        target_stage,
    )
