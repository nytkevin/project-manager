from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.task import Task
from app.models.task_review import TaskReview
from app.models.work_session import WorkSession
from app.services.time_tracking_service import active_work_seconds


def generate_task_completion_report(db: Session, project_id: UUID, task: Task) -> str:
    if task.stage != "Completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed tasks have reports",
        )
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    sessions = db.scalars(select(WorkSession).where(WorkSession.task_id == task.id)).all()
    reviews = db.scalars(select(TaskReview).where(TaskReview.task_id == task.id)).all()
    active_seconds = active_work_seconds(sessions, datetime.now(timezone.utc))
    approved = next((review for review in reviews if review.result == "Approved"), None)
    return (
        "PROJECTHUB TASK COMPLETION REPORT\n"
        f"Project: {project.name} ({project.id})\n"
        f"Task: {task.title} ({task.display_id})\n"
        f"Description: {task.description}\n"
        f"Acceptance criteria: {task.acceptance_criteria}\n"
        f"Category: {task.category} | Priority: {task.priority}\n"
        f"Assigned developer: {task.assignee_id or 'Unassigned'}\n"
        f"Assignment timestamp: {task.assigned_at or 'Not recorded'}\n"
        f"Development start: {task.first_started_at or 'Not recorded'}\n"
        f"Submission timestamp: {task.submitted_at or 'Not recorded'}\n"
        f"Active working seconds: {active_seconds}\n"
        f"Work sessions: {len(sessions)}\n"
        f"Reviewer: {approved.reviewer_id if approved else 'Not recorded'}\n"
        f"Review date: {approved.created_at if approved else 'Not recorded'}\n"
        f"Review result: {approved.result if approved else 'Not approved'}\n"
        f"Review comments: {approved.comments if approved else ''}\n"
        f"Review iterations: {len(reviews)}\n"
        f"Completed at: {task.completed_at or 'Not completed'}\n"
        f"Git references: {task.git_reference or 'None'}\n"
        f"Testing notes: {task.testing_notes or ''}\n"
        "Application-recorded review: not a cryptographic signature or independent certification.\n"
    )


def get_project_task_analytics(
    db: Session,
    project_id: UUID,
    start: datetime,
    end: datetime,
) -> dict:
    if end < start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be after start date")

    tasks = db.scalars(select(Task).where(Task.project_id == project_id)).all()
    start = start if start.tzinfo else start.replace(tzinfo=timezone.utc)
    end = end if end.tzinfo else end.replace(tzinfo=timezone.utc)

    def in_period(value: datetime | None) -> bool:
        if value is None:
            return False
        comparable = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return start <= comparable <= end

    completed = [task for task in tasks if in_period(task.completed_at)]
    started = [task for task in tasks if in_period(task.first_started_at)]
    submitted = [task for task in tasks if in_period(task.submitted_at)]
    overdue = [
        task
        for task in tasks
        if task.stage != "Completed"
        and task.due_date is not None
        and (task.due_date if task.due_date.tzinfo else task.due_date.replace(tzinfo=timezone.utc))
        < datetime.now(timezone.utc)
    ]

    # Daily buckets are suitable for 7/30-day ranges. The frontend can aggregate longer ranges.
    buckets: dict[str, dict[str, int]] = {}
    cursor = start.date()
    end_date = end.date()
    while cursor <= end_date:
        buckets[cursor.isoformat()] = {"started": 0, "completed": 0, "submitted": 0}
        cursor = cursor.fromordinal(cursor.toordinal() + 1)

    for task in started:
        if task.first_started_at:
            value = task.first_started_at if task.first_started_at.tzinfo else task.first_started_at.replace(tzinfo=timezone.utc)
            key = value.astimezone(timezone.utc).date().isoformat()
            if key in buckets:
                buckets[key]["started"] += 1
    for task in completed:
        if task.completed_at:
            value = task.completed_at if task.completed_at.tzinfo else task.completed_at.replace(tzinfo=timezone.utc)
            key = value.astimezone(timezone.utc).date().isoformat()
            if key in buckets:
                buckets[key]["completed"] += 1
    for task in submitted:
        if task.submitted_at:
            value = task.submitted_at if task.submitted_at.tzinfo else task.submitted_at.replace(tzinfo=timezone.utc)
            key = value.astimezone(timezone.utc).date().isoformat()
            if key in buckets:
                buckets[key]["submitted"] += 1

    cumulative_before = sum(
        1
        for task in tasks
        if task.completed_at is not None
        and (task.completed_at if task.completed_at.tzinfo else task.completed_at.replace(tzinfo=timezone.utc))
        < start
    )
    cumulative = cumulative_before
    timeline = []
    for date_key, counts in buckets.items():
        cumulative += counts["completed"]
        timeline.append({"date": date_key, **counts, "cumulative_completed": cumulative})

    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "completed": len(completed),
        "started": len(started),
        "submitted": len(submitted),
        "currently_active": sum(1 for task in tasks if task.stage == "Active"),
        "overdue": len(overdue),
        "unfinished": sum(1 for task in tasks if task.stage != "Completed"),
        "cumulative_completed_before_period": cumulative_before,
        "timeline": timeline,
        "pipeline": {
            stage: sum(1 for task in tasks if task.stage == stage)
            for stage in ("Backlog", "Assigned", "Ready", "Active", "In Review", "Completed")
        },
    }
