from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    acceptance_criteria: str = ""
    category: str = "Feature"
    priority: str = "Medium"
    estimated_effort: str = ""
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    acceptance_criteria: str | None = None
    category: str | None = None
    priority: str | None = None
    estimated_effort: str | None = None
    due_date: datetime | None = None

    @model_validator(mode="after")
    def reject_null_non_nullable_fields(self):
        for field in (
            "title",
            "description",
            "acceptance_criteria",
            "category",
            "priority",
            "estimated_effort",
        ):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class TaskAssign(BaseModel):
    assignee_id: UUID


class TaskTransition(BaseModel):
    stage: str


class TaskSubmission(BaseModel):
    notes: str
    git_reference: str = ""
    testing_notes: str = ""
    limitations: str = ""


class TaskCommentCreate(BaseModel):
    body: str = Field(min_length=1)
