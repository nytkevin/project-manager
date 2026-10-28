from datetime import datetime, timezone
from uuid import UUID, uuid4

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest


def _save_refresh_token(
    db: Session,
    user_id: UUID,
    raw_token: str,
    expires_at: datetime,
    token_id: str,
    family_id: str,
) -> None:
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw_token),
            token_id=token_id,
            family_id=family_id,
            expires_at=expires_at,
        )
    )


def authenticate_and_issue_tokens(
    db: Session, credentials: LoginRequest
) -> tuple[User, str, str]:
    user = db.scalar(select(User).where(User.email == credentials.email))
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token, _, _ = create_access_token(user.id)
    refresh_token, refresh_expires, refresh_id = create_refresh_token(user.id)
    _save_refresh_token(
        db, user.id, refresh_token, refresh_expires, refresh_id, str(uuid4())
    )
    db.commit()
    return user, access_token, refresh_token


def rotate_refresh_token(db: Session, raw_token: str) -> tuple[User, str, str]:
    try:
        payload = decode_token(raw_token, "refresh")
        token_id = payload["jti"]
        user_id = UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from None

    record = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_id == token_id)
        .with_for_update()
    )
    now = datetime.now(timezone.utc)
    if (
        record is None
        or record.user_id != user_id
        or record.revoked_at is not None
        or record.expires_at <= now
        or record.token_hash != hash_token(raw_token)
    ):
        if record is not None and record.revoked_at is not None:
            db.execute(
                update(RefreshToken)
                .where(RefreshToken.family_id == record.family_id)
                .values(revoked_at=now)
            )
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    record.revoked_at = now
    access_token, _, _ = create_access_token(user.id)
    replacement, expires_at, replacement_id = create_refresh_token(user.id)
    _save_refresh_token(
        db, user.id, replacement, expires_at, replacement_id, record.family_id
    )
    db.commit()
    return user, access_token, replacement
