from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ProjectMemberResponse(BaseModel):
    user_id: UUID
    fullname: str
    username: str
    email: str
    roles: str
    created_at: datetime
