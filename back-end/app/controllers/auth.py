from datetime import datetime, timezone

import jwt
from fastapi import HTTPException, Response, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token, generate_csrf_token
from app.models.refresh_token import RefreshToken
from app.schemas.auth import AuthResponse, LoginRequest
from app.services.auth_service import (
    authenticate_and_issue_tokens,
    rotate_refresh_token,
)


ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrf_token"


def _set_cookie(response: Response, key: str, value: str, max_age: int, path: str) -> None:
    response.set_cookie(
        key,
        value,
        max_age=max_age,
        httponly=key != CSRF_COOKIE,
        secure=settings.secure_cookies,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path=path,
    )


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    _set_cookie(
        response,
        ACCESS_COOKIE,
        access_token,
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "/",
    )
    _set_cookie(
        response,
        REFRESH_COOKIE,
        refresh_token,
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        "/auth",
    )
    _set_cookie(response, CSRF_COOKIE, generate_csrf_token(), settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, "/")


def login(
    db: Session, credentials: LoginRequest, response: Response
) -> AuthResponse:
    user, access_token, refresh_token = authenticate_and_issue_tokens(db, credentials)
    _set_auth_cookies(response, access_token, refresh_token)
    return AuthResponse(message="Login successful", user=user)


def refresh(db: Session, raw_token: str | None, response: Response) -> AuthResponse:
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")
    user, access_token, refresh_token = rotate_refresh_token(db, raw_token)
    _set_auth_cookies(response, access_token, refresh_token)
    return AuthResponse(message="Token refreshed", user=user)


def logout(db: Session, raw_token: str | None, response: Response) -> dict[str, str]:
    if raw_token:
        try:
            payload = decode_token(raw_token, "refresh")
            db.execute(
                update(RefreshToken)
                .where(RefreshToken.token_id == payload["jti"])
                .values(revoked_at=datetime.now(timezone.utc))
            )
            db.commit()
        except (jwt.InvalidTokenError, ValueError, KeyError):
            db.rollback()

    response.delete_cookie(ACCESS_COOKIE, path="/", domain=settings.COOKIE_DOMAIN)
    response.delete_cookie(REFRESH_COOKIE, path="/auth", domain=settings.COOKIE_DOMAIN)
    response.delete_cookie(CSRF_COOKIE, path="/", domain=settings.COOKIE_DOMAIN)
    return {"message": "Logged out successfully"}
