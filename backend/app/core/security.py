from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import jwt

from app.core.config import settings

ALGORITHM = "HS256"


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    pwd_bytes: bytes = password.encode(encoding="utf-8")
    hashed_pwd_bytes = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_pwd_bytes.decode(encoding="utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        password=plain_password.encode(encoding="utf-8"),
        hashed_password=hashed_password.encode(encoding="utf-8"),
    )


def create_access_token(
    subject: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    expire = datetime.now(tz=timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode = subject.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
