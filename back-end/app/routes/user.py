from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.controllers.user import create_user, list_users
from app.dependencies.database import get_db
from app.schemas.user import UserCreate, UserResponse


router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def post_user(user_data: UserCreate, db: Session = Depends(get_db)):
    return create_user(db, user_data)


@router.get("", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return list_users(db)
