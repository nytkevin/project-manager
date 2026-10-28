import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
from pwdlib import PasswordHash

from app.core.config import settings


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, stored_hash: str) -> bool:
    return password_hash.verify(plain_password, stored_hash)


def _create_token(
    user_id: UUID,
    token_type: str,
    secret: str,
    expires_delta: timedelta,
) -> tuple[str, datetime, str]:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + expires_delta
    token_id = str(uuid4())
    payload = {
        "sub": str(user_id),
        "exp": expires_at,
        "iat": issued_at,
        "jti": token_id,
        "type": token_type,
    }
    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM), expires_at, token_id


def create_access_token(user_id: UUID) -> tuple[str, datetime, str]:
    return _create_token(
        user_id,
        "access",
        settings.JWT_ACCESS_SECRET,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: UUID) -> tuple[str, datetime, str]:
    return _create_token(
        user_id,
        "refresh",
        settings.JWT_REFRESH_SECRET,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, token_type: str) -> dict:
    secret = settings.JWT_ACCESS_SECRET if token_type == "access" else settings.JWT_REFRESH_SECRET
    payload = jwt.decode(
        token,
        secret,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "exp", "iat", "jti", "type"]},
    )
    if payload.get("type") != token_type:
        raise jwt.InvalidTokenError("Invalid token type")
    UUID(payload["sub"])
    return payload


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)
