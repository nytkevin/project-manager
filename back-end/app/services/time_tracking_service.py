from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent
from app.models.task import Task
from app.models.work_session import WorkSession


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def active_work_seconds(sessions: list[WorkSession], now: datetime | None = None) -> int:
    current_time = now or datetime.now(timezone.utc)
    return sum(
        max(
            0,
            int(
                (
                    _as_utc(session.ended_at or current_time)
                    - _as_utc(session.started_at)
                ).total_seconds()
            ),
        )
        for session in sessions
    )


def list_task_work_sessions(db: Session, task_id: UUID) -> list[WorkSession]:
    return db.scalars(
        select(WorkSession)
        .where(WorkSession.task_id == task_id)
        .order_by(WorkSession.started_at)
    ).all()


def start_work_session(db: Session, task: Task, user_id: UUID) -> WorkSession:
    if task.stage != "Active" or task.assignee_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only the assigned developer can start work on an active task",
        )
    db.flush()
    active_session = db.scalar(
        select(WorkSession).where(
            WorkSession.task_id == task.id,
            WorkSession.ended_at.is_(None),
        )
    )
    if active_session is not None:
        if active_session.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Task already has an active work session",
            )
        task.active_started_at = active_session.started_at
        return active_session

    now = datetime.now(timezone.utc)
    session = WorkSession(task_id=task.id, user_id=user_id, started_at=now)
    db.add(session)
    task.first_started_at = task.first_started_at or now
    task.active_started_at = now
    task.last_activity_at = now
    db.add(AuditEvent(task_id=task.id, actor_id=user_id, action="work_session.started"))
    return session


def stop_active_work_session(db: Session, task: Task, user_id: UUID) -> WorkSession | None:
    session = db.scalar(
        select(WorkSession).where(
            WorkSession.task_id == task.id,
            WorkSession.ended_at.is_(None),
        )
    )
    if session is None:
        task.active_started_at = None
        return None
    if session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the session owner can stop this work session",
        )
    session.ended_at = datetime.now(timezone.utc)
    task.active_started_at = None
    return session


def stop_work_session(db: Session, task: Task, user_id: UUID) -> WorkSession:
    session = stop_active_work_session(db, task, user_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active work session")
    task.last_activity_at = datetime.now(timezone.utc)
    db.add(AuditEvent(task_id=task.id, actor_id=user_id, action="work_session.stopped"))
    db.commit()
    db.refresh(session)
    return session
