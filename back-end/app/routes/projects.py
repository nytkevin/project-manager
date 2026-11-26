from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.dependencies.permissions import get_project_membership, require_project_roles
from app.models.project_membership import ProjectMembership
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.project_service import (
    create_project,
    get_project,
    list_user_projects,
    update_project,
)


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_user_projects(db, current_user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_project_route(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_project(db, payload, current_user.id)


@router.get("/{project_id}")
def project_details(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    return get_project(db, project_id)


@router.patch("/{project_id}")
def update_project_route(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(require_project_roles("owner", "manager")),
):
    return update_project(db, project_id, payload.model_dump(exclude_unset=True))
