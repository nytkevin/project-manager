from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.user import User


def get_project_membership(
    db: Session, project_id: UUID, user_id: UUID
) -> ProjectMembership | None:
    return db.scalar(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id,
        )
    )


def require_project_member(db: Session, project_id: UUID, user_id: UUID) -> ProjectMembership:
    membership = get_project_membership(db, project_id, user_id)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project membership required",
        )
    return membership


def require_project_role(membership: ProjectMembership, *roles: str) -> None:
    assigned_roles = {role.strip().lower() for role in membership.roles.split(",")}
    if not assigned_roles.intersection(role.lower() for role in roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient project permission",
        )


def list_project_members(db: Session, project_id: UUID) -> list[dict]:
    rows = db.execute(
        select(ProjectMembership, User)
        .join(User, User.id == ProjectMembership.user_id)
        .where(ProjectMembership.project_id == project_id)
        .order_by(ProjectMembership.created_at)
    ).all()
    return [
        {
            "user_id": membership.user_id,
            "fullname": user.fullname,
            "username": user.username,
            "email": user.email,
            "roles": membership.roles,
            "created_at": membership.created_at,
        }
        for membership, user in rows
    ]


def update_project_membership(
    db: Session, project_id: UUID, user_id: UUID, roles: str
) -> ProjectMembership:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if db.get(User, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    membership = get_project_membership(db, project_id, user_id)
    if membership is None:
        membership = ProjectMembership(project_id=project_id, user_id=user_id, roles=roles)
        db.add(membership)
    else:
        membership.roles = roles
    db.commit()
    db.refresh(membership)
    return membership


def remove_project_membership(db: Session, project_id: UUID, user_id: UUID) -> None:
    membership = get_project_membership(db, project_id, user_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project membership not found")
    if "owner" in {role.strip().lower() for role in membership.roles.split(",")}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The project owner cannot be removed")

    from app.models.task import Task

    assigned = db.scalar(
        select(Task).where(Task.project_id == project_id, Task.assignee_id == user_id)
    )
    if assigned is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reassign this member's tasks before removing their membership",
        )
    db.delete(membership)
    db.commit()
