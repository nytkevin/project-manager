from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.controllers.user import create_user
from app.dependencies.database import get_db
from app.schemas.user import UserCreate, UserResponse


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    return create_user(db, user_data)
