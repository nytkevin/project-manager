from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent
from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.user import User
from app.schemas.task import TaskCreate
from app.services.workflow_service import apply_task_transition


def list_project_tasks(db: Session, project_id: UUID) -> list[Task]:
    return db.scalars(
        select(Task).where(Task.project_id == project_id).order_by(Task.created_at)
    ).all()


def get_task(db: Session, project_id: UUID, task_id: UUID) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def create_task(
    db: Session, project_id: UUID, payload: TaskCreate, actor_id: UUID
) -> Task:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    task = Task(
        display_id=f"PH-{str(uuid4().int)[-6:]}",
        project_id=project_id,
        stage="Backlog",
        **payload.model_dump(),
    )
    db.add(task)
    db.flush()
    db.add(AuditEvent(task_id=task.id, actor_id=actor_id, action="task.created"))
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: Task, updates: dict, actor_id: UUID) -> Task:
    previous_values = []
    for field, value in updates.items():
        previous = getattr(task, field)
        if previous != value:
            setattr(task, field, value)
            previous_values.append((field, previous, value))
    if previous_values:
        task.last_activity_at = datetime.now(timezone.utc)
        db.add(
            AuditEvent(
                task_id=task.id,
                actor_id=actor_id,
                action="task.updated",
                previous_value=", ".join(f"{field}={value}" for field, value, _ in previous_values),
                new_value=", ".join(f"{field}={value}" for field, _, value in previous_values),
            )
        )
    db.commit()
    db.refresh(task)
    return task


def assign_task(
    db: Session,
    task: Task,
    assignee_id: UUID,
    actor: User,
    membership: ProjectMembership,
) -> Task:
    assignee_membership = db.scalar(
        select(ProjectMembership).where(
            ProjectMembership.project_id == task.project_id,
            ProjectMembership.user_id == assignee_id,
        )
    )
    if assignee_membership is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must be a project member",
        )

    previous_assignee = task.assignee_id
    now = datetime.now(timezone.utc)
    task.assignee_id = assignee_id
    task.assigned_at = now
    task.assigned_by = actor.id
    task.last_activity_at = now
    db.add(
        AuditEvent(
            task_id=task.id,
            actor_id=actor.id,
            action="task.assigned",
            previous_value=str(previous_assignee) if previous_assignee else None,
            new_value=str(assignee_id),
        )
    )
    if task.stage == "Backlog":
        apply_task_transition(db, task, "Assigned", actor, membership, start_session=False)
    db.commit()
    db.refresh(task)
    return task


def add_task_comment(db: Session, task: Task, actor_id: UUID, body: str) -> None:
    db.add(TaskComment(task_id=task.id, user_id=actor_id, body=body))
    db.add(AuditEvent(task_id=task.id, actor_id=actor_id, action="task.commented"))
    db.commit()
