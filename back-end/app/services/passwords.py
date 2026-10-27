import base64
import hashlib
import hmac
import secrets


_SALT_BYTES = 16
_HASH_BYTES = 32
_SCRYPT_N = 16_384
_SCRYPT_R = 8
_SCRYPT_P = 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_HASH_BYTES,
    )
    return "scrypt${}${}${}${}".format(
        _SCRYPT_N,
        _SCRYPT_R,
        _SCRYPT_P,
        base64.urlsafe_b64encode(salt + digest).decode("ascii"),
    )


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, n, r, p, encoded_value = encoded_hash.split("$", 4)
        if algorithm != "scrypt":
            return False
        value = base64.urlsafe_b64decode(encoded_value.encode("ascii"))
        salt, expected_digest = value[:_SALT_BYTES], value[_SALT_BYTES:]
        actual_digest = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected_digest),
        )
    except (ValueError, TypeError):
        return False

    return hmac.compare_digest(actual_digest, expected_digest)
