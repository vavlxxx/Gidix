from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import ALGORITHM
from app.db import get_db
from app.models import Rule, User, UserRole, UserRule


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
        ) from exc


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = _decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен без идентификатора")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не активен")
    return user


def get_optional_user(token: str | None = Depends(oauth2_optional), db: Session = Depends(get_db)) -> User | None:
    if not token:
        return None
    payload = _decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        return None
    return user


def require_roles(*roles: str) -> Callable:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role == UserRole.superuser:
            return user
        if user.role.value not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        return user

    return dependency


def require_rules(*codes: str) -> Callable:
    def dependency(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if user.role == UserRole.superuser:
            return user
        if not codes:
            return user
        has_rule = (
            db.query(Rule)
            .join(UserRule, Rule.id == UserRule.rule_id)
            .filter(UserRule.user_id == user.id, Rule.code.in_(codes))
            .first()
        )
        if has_rule:
            return user
        detail = "Недостаточно прав"
        if len(codes) == 1:
            rule = db.query(Rule).filter(Rule.code == codes[0]).first()
            if rule and rule.error_message:
                detail = rule.error_message
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    return dependency
