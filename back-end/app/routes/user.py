from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse



users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("/me", response_model=UserResponse)
def user_me(current_user: User = Depends(get_current_user)):
    return current_user
