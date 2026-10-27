from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
from app.services.passwords import hash_password


def create_user(db: Session, user_data: UserCreate) -> User:
    user = User(
        fullname=user_data.fullname,
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email or username already exists.",
        ) from exc

    db.refresh(user)
    return user


def list_users(db: Session) -> list[User]:
    return list(db.query(User).order_by(User.created_at, User.id).all())