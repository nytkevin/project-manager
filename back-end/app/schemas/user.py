from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    fullname: str = Field(min_length=3, max_length=255)
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: UUID
    fullname: str
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)