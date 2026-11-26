from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class WorkSessionResponse(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class WorkSessionSummary(BaseModel):
    active_seconds: int
    sessions: list[WorkSessionResponse]
