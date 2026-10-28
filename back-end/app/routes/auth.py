from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlalchemy.orm import Session

from app.controllers.auth import login, logout, refresh
from app.controllers.user import create_user
from app.dependencies.csrf import require_csrf
from app.dependencies.database import get_db
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    user = create_user(db, payload)
    return AuthResponse(message="User registered successfully", user=user)


@router.post("/login", response_model=AuthResponse)
def login_user(
    credentials: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    return login(db, credentials, response)


@router.post("/refresh", response_model=AuthResponse)
def refresh_tokens(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
    _: None = Depends(require_csrf),
):
    return refresh(db, refresh_token, response)


@router.post("/logout")
def logout_user(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
    _: None = Depends(require_csrf),
):
    return logout(db, refresh_token, response)
