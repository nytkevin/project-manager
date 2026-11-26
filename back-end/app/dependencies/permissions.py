from typing import Callable
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.project_membership import ProjectMembership
from app.models.user import User
from app.services.team_service import require_project_member, require_project_role


def get_project_membership(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectMembership:
    return require_project_member(db, project_id, current_user.id)


def require_project_roles(*roles: str) -> Callable[..., ProjectMembership]:
    def dependency(
        membership: ProjectMembership = Depends(get_project_membership),
    ) -> ProjectMembership:
        require_project_role(membership, *roles)
        return membership

    return dependency
