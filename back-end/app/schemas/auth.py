from pydantic import BaseModel, EmailStr

from app.schemas.user import UserCreate, UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(UserCreate):
    pass


class AuthResponse(BaseModel):
    message: str
    user: UserResponse
