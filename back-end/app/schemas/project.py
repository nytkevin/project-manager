from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    status: str = "Active"
    priority: str = "Medium"
    start_date: datetime | None = None
    deadline: datetime | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    start_date: datetime | None = None
    deadline: datetime | None = None

    @model_validator(mode="after")
    def reject_null_non_nullable_fields(self):
        for field in ("name", "description", "status", "priority"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class ProjectResponse(ProjectCreate):
    id: UUID
    created_at: datetime
