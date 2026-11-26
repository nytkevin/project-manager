from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.main import app
from app.models.audit_event import AuditEvent
from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.task import Task
from app.models.task_review import TaskReview
from app.models.user import User
from app.models.work_session import WorkSession
from app.schemas.review import TaskReview as TaskReviewRequest
from app.services.review_service import review_task
from app.services.time_tracking_service import start_work_session
from app.services.workflow_service import apply_task_transition
from app.services.report_service import get_project_task_analytics


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, autoflush=False) as session:
        yield session
    engine.dispose()


def _create_user(db: Session, email: str, username: str) -> User:
    user = User(
        email=email,
        username=username,
        fullname=username,
        password_hash="not-used",
    )
    db.add(user)
    db.flush()
    return user


def test_domain_models_register_existing_table_columns():
    expected_columns = {
        "projects": (
            "id", "name", "description", "status", "priority", "start_date", "deadline", "created_at"
        ),
        "project_memberships": ("id", "project_id", "user_id", "roles", "created_at"),
        "tasks": (
            "id", "display_id", "project_id", "title", "description", "acceptance_criteria",
            "category", "priority", "estimated_effort", "due_date", "stage", "assignee_id",
            "assigned_at", "assigned_by", "first_started_at", "active_started_at", "submitted_at",
            "submission_notes", "git_reference", "testing_notes", "completed_at", "approved_by",
            "blocked_reason", "created_at", "last_activity_at",
        ),
        "work_sessions": ("id", "task_id", "user_id", "started_at", "ended_at"),
        "task_reviews": ("id", "task_id", "reviewer_id", "result", "comments", "created_at"),
        "task_comments": ("id", "task_id", "user_id", "body", "created_at"),
        "audit_events": (
            "id", "task_id", "actor_id", "action", "previous_value", "new_value", "created_at"
        ),
    }

    assert set(Base.metadata.tables) == set(expected_columns) | {"users", "refresh_tokens"}
    for table_name, columns in expected_columns.items():
        assert tuple(Base.metadata.tables[table_name].columns.keys()) == columns


def test_existing_project_workflow_api_paths_are_registered():
    paths = app.openapi()["paths"]
    expected_methods = {
        "/projects": {"get", "post"},
        "/projects/{project_id}/memberships": {"post"},
        "/projects/{project_id}/tasks": {"get", "post"},
        "/projects/{project_id}/tasks/{task_id}/assign": {"post"},
        "/projects/{project_id}/tasks/{task_id}/transition": {"post"},
        "/projects/{project_id}/tasks/{task_id}/submit": {"post"},
        "/projects/{project_id}/tasks/{task_id}/reviews": {"post"},
        "/projects/{project_id}/tasks/{task_id}/comments": {"post"},
        "/projects/{project_id}/tasks/{task_id}/report": {"get"},
        "/projects/{project_id}/analytics": {"get"},
        "/projects/{project_id}/memberships/{user_id}": {"delete"},
    }

    for path, methods in expected_methods.items():
        assert methods <= paths[path].keys()


def test_work_session_stops_for_review_and_rework_can_resume(db: Session):
    project = Project(name="Refactor project")
    developer = _create_user(db, "developer@example.test", "developer")
    reviewer = _create_user(db, "reviewer@example.test", "reviewer")
    db.add(project)
    db.flush()
    developer_membership = ProjectMembership(
        project_id=project.id,
        user_id=developer.id,
        roles="developer",
    )
    reviewer_membership = ProjectMembership(
        project_id=project.id,
        user_id=reviewer.id,
        roles="reviewer",
    )
    task = Task(
        display_id="PH-100001",
        project_id=project.id,
        title="Refactor backend",
        description="A sufficiently detailed task description.",
        acceptance_criteria="The refactor is tested.",
        stage="Ready",
        assignee_id=developer.id,
    )
    db.add_all([developer_membership, reviewer_membership, task])
    db.flush()

    apply_task_transition(db, task, "Active", developer, developer_membership)
    db.flush()
    session = db.scalar(select(WorkSession).where(WorkSession.task_id == task.id))
    assert session is not None
    assert session.ended_at is None

    task.submitted_at = datetime.now(timezone.utc)
    apply_task_transition(db, task, "In Review", developer, developer_membership)
    db.flush()
    assert session.ended_at is not None
    assert task.active_started_at is None

    review_task(
        db,
        task,
        TaskReviewRequest(result="Changes Requested", comments="Please address the test gaps."),
        reviewer,
        reviewer_membership,
    )
    assert task.stage == "Active"
    assert task.active_started_at is None
    assert len(db.scalars(select(TaskReview).where(TaskReview.task_id == task.id)).all()) == 1

    start_work_session(db, task, developer.id)
    db.flush()
    sessions = db.scalars(
        select(WorkSession).where(WorkSession.task_id == task.id).order_by(WorkSession.started_at)
    ).all()
    assert len(sessions) == 2
    assert sessions[-1].ended_at is None
    assert len(db.scalars(select(AuditEvent).where(AuditEvent.task_id == task.id)).all()) >= 3


def test_task_cannot_be_approved_by_its_assignee(db: Session):
    project = Project(name="Review permissions")
    developer = _create_user(db, "assignee@example.test", "assignee")
    db.add(project)
    db.flush()
    membership = ProjectMembership(
        project_id=project.id,
        user_id=developer.id,
        roles="reviewer,developer",
    )
    task = Task(
        display_id="PH-100002",
        project_id=project.id,
        title="Review task",
        description="Task ready for a review.",
        acceptance_criteria="Changes are reviewed.",
        stage="In Review",
        assignee_id=developer.id,
    )
    db.add_all([membership, task])
    db.flush()

    with pytest.raises(HTTPException) as error:
        review_task(
            db,
            task,
            TaskReviewRequest(result="Approved", comments="Looks good."),
            developer,
            membership,
        )

    assert error.value.status_code == 400
    assert db.scalar(select(TaskReview).where(TaskReview.task_id == task.id)) is None


def test_non_reviewer_cannot_approve_task(db: Session):
    project = Project(name="Reviewer permissions")
    assignee = _create_user(db, "assigned@example.test", "assigned")
    developer = _create_user(db, "developer-only@example.test", "developer-only")
    db.add(project)
    db.flush()
    membership = ProjectMembership(
        project_id=project.id,
        user_id=developer.id,
        roles="developer",
    )
    task = Task(
        display_id="PH-100005",
        project_id=project.id,
        title="Restricted approval",
        description="A task awaiting a reviewer.",
        acceptance_criteria="Only a reviewer can approve.",
        stage="In Review",
        assignee_id=assignee.id,
    )
    db.add_all([membership, task])
    db.flush()

    with pytest.raises(HTTPException) as error:
        review_task(
            db,
            task,
            TaskReviewRequest(result="Approved", comments="Looks good."),
            developer,
            membership,
        )

    assert error.value.status_code == 403
    assert db.scalar(select(TaskReview).where(TaskReview.task_id == task.id)) is None


def test_authorized_review_approval_completes_task_and_preserves_history(db: Session):
    project = Project(name="Approval workflow")
    developer = _create_user(db, "worker@example.test", "worker")
    reviewer = _create_user(db, "approver@example.test", "approver")
    db.add(project)
    db.flush()
    developer_membership = ProjectMembership(
        project_id=project.id,
        user_id=developer.id,
        roles="developer",
    )
    reviewer_membership = ProjectMembership(
        project_id=project.id,
        user_id=reviewer.id,
        roles="reviewer",
    )
    task = Task(
        display_id="PH-100003",
        project_id=project.id,
        title="Approve task",
        description="Task submitted for review.",
        acceptance_criteria="Approval is recorded.",
        stage="In Review",
        assignee_id=developer.id,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add_all([developer_membership, reviewer_membership, task])
    db.flush()

    review_task(
        db,
        task,
        TaskReviewRequest(result="Approved", comments="Acceptance criteria met."),
        reviewer,
        reviewer_membership,
    )

    review = db.scalar(select(TaskReview).where(TaskReview.task_id == task.id))
    assert task.stage == "Completed"
    assert task.approved_by == reviewer.id
    assert task.completed_at is not None
    assert review is not None and review.result == "Approved"
    assert len(db.scalars(select(AuditEvent).where(AuditEvent.task_id == task.id)).all()) == 2


def test_task_cannot_enter_ready_without_assignee_and_required_details(db: Session):
    project = Project(name="Readiness checks")
    manager = _create_user(db, "manager@example.test", "manager")
    db.add(project)
    db.flush()
    membership = ProjectMembership(
        project_id=project.id,
        user_id=manager.id,
        roles="manager",
    )
    task = Task(
        display_id="PH-100004",
        project_id=project.id,
        title="Incomplete task",
        description="",
        acceptance_criteria="",
        stage="Assigned",
    )
    db.add_all([membership, task])
    db.flush()

    with pytest.raises(HTTPException) as error:
        apply_task_transition(db, task, "Ready", manager, membership)

    assert error.value.status_code == 400
    assert task.stage == "Assigned"


def test_project_analytics_uses_recorded_timestamps(db: Session):
    project = Project(name="Analytics project")
    db.add(project)
    db.flush()
    now = datetime.now(timezone.utc)
    db.add_all([
        Task(
            display_id="PH-100006",
            project_id=project.id,
            title="Completed during period",
            stage="Completed",
            first_started_at=now,
            submitted_at=now,
            completed_at=now,
        ),
        Task(
            display_id="PH-100007",
            project_id=project.id,
            title="Currently active",
            stage="Active",
            first_started_at=now,
        ),
    ])
    db.commit()

    analytics = get_project_task_analytics(
        db,
        project.id,
        now - timedelta(days=1),
        now + timedelta(days=1),
    )

    assert analytics["completed"] == 1
    assert analytics["started"] == 2
    assert analytics["submitted"] == 1
    assert analytics["currently_active"] == 1
