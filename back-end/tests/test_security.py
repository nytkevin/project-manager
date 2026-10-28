from uuid import uuid4

import jwt
import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_argon2_password_hash_round_trip():
    password_hash = hash_password("strong-password")

    assert password_hash != "strong-password"
    assert verify_password("strong-password", password_hash)
    assert not verify_password("wrong-password", password_hash)


def test_access_and_refresh_tokens_have_distinct_types():
    user_id = uuid4()
    access_token, _, _ = create_access_token(user_id)
    refresh_token, _, _ = create_refresh_token(user_id)

    assert decode_token(access_token, "access")["type"] == "access"
    assert decode_token(refresh_token, "refresh")["type"] == "refresh"

    with pytest.raises(jwt.InvalidTokenError):
        decode_token(refresh_token, "access")
