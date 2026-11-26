from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate



users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("/me", response_model=UserResponse)
def user_me(current_user: User = Depends(get_current_user)):
    return current_user


@users_router.patch("/me", response_model=UserResponse)
def update_user_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
