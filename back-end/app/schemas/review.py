from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TaskReview(BaseModel):
    result: str
    comments: str


class TaskReviewResponse(BaseModel):
    id: UUID
    task_id: UUID
    reviewer_id: UUID
    result: str
    comments: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
