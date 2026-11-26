from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.permissions import get_project_membership, require_project_roles
from app.models.project_membership import ProjectMembership
from app.schemas.team import ProjectMemberResponse
from app.services.team_service import list_project_members, remove_project_membership, update_project_membership


router = APIRouter(prefix="/projects", tags=["teams"])


@router.post("/{project_id}/memberships")
def add_membership(
    project_id: UUID,
    user_id: UUID,
    roles: str = "developer",
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(require_project_roles("owner", "manager")),
):
    update_project_membership(db, project_id, user_id, roles)
    return {"message": "Project membership updated"}


@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
def project_members(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    return list_project_members(db, project_id)


@router.delete("/{project_id}/memberships/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_membership(
    project_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    membership: ProjectMembership = Depends(require_project_roles("owner", "manager")),
):
    remove_project_membership(db, project_id, user_id)


@router.get(
    "/{project_id}/members/lookup",
    response_model=list[ProjectMemberResponse],
    include_in_schema=False,
)
def lookup_project_members(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: ProjectMembership = Depends(get_project_membership),
):
    return list_project_members(db, project_id)
