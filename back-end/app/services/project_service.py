from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.schemas.project import ProjectCreate


def list_user_projects(db: Session, user_id: UUID) -> list[Project]:
    project_ids = db.scalars(
        select(ProjectMembership.project_id).where(ProjectMembership.user_id == user_id)
    ).all()
    if not project_ids:
        return []
    return db.scalars(select(Project).where(Project.id.in_(project_ids))).all()


def get_project(db: Session, project_id: UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def create_project(db: Session, payload: ProjectCreate, owner_id: UUID) -> Project:
    project = Project(**payload.model_dump())
    db.add(project)
    db.flush()
    db.add(
        ProjectMembership(
            project_id=project.id,
            user_id=owner_id,
            roles="owner,manager",
        )
    )
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project_id: UUID, updates: dict) -> Project:
    project = get_project(db, project_id)
    for field, value in updates.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project
