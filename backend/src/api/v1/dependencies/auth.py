from __future__ import annotations

from typing import Annotated, Callable

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.api.v1.dependencies.db import DBDep
from src.config import settings
from src.models.auth import User
from src.schemas.auth import TokenType
from src.services.auth import AuthService, TokenService
from src.utils.exceptions import (
    CannotDecodeTokenError,
    CannotDecodeTokenHTTPError,
    ExpiredSignatureHTTPError,
    InvalidTokenTypeHTTPError,
    MissingSubjectHTTPError,
    MissingTokenHTTPError,
    NotEnoughPermissionsHTTPError,
    ObjectNotFoundError,
    TokenExipedError,
    UserNotFoundError,
    UserNotFoundHTTPError,
    WithdrawnTokenHTTPError,
)

_bearer = HTTPBearer(auto_error=True)
BearerCredentials = Annotated[HTTPAuthorizationCredentials, Depends(_bearer)]


def _decode_token(token: str) -> dict:
    try:
        return TokenService().decode_token(token)
    except TokenExipedError as exc:
        raise ExpiredSignatureHTTPError from exc
    except CannotDecodeTokenError as exc:
        raise CannotDecodeTokenHTTPError from exc


def _validate_token_type(payload: dict, expected_type: TokenType) -> None:
    token_type = payload.get("type")
    if token_type != expected_type.value:
        raise InvalidTokenTypeHTTPError(expected_type=expected_type.value, actual_type=token_type)


def _extract_token_subject(payload: dict) -> int:
    sub = payload.get("sub")
    if not sub:
        raise MissingSubjectHTTPError
    return int(sub)


def resolve_token_by_type(token_type: TokenType):
    if token_type == TokenType.ACCESS:

        def get_sub_from_access(creds: BearerCredentials) -> int:
            payload = _decode_token(creds.credentials)
            _validate_token_type(payload, token_type)
            return _extract_token_subject(payload)

        return get_sub_from_access

    async def get_sub_from_refresh(request: Request, db: DBDep) -> int:
        token = request.cookies.get(settings.auth.REFRESH_TOKEN_COOKIE_KEY)
        if not token:
            raise MissingTokenHTTPError
        payload = _decode_token(token)
        _validate_token_type(payload, token_type)
        uid = _extract_token_subject(payload)
        try:
            await TokenService(db).verify_persisted_refresh(uid=uid, token=token)
        except ObjectNotFoundError as exc:
            raise WithdrawnTokenHTTPError from exc
        return uid

    return get_sub_from_refresh


UidByAccess = Annotated[int, Depends(resolve_token_by_type(TokenType.ACCESS))]
UidByRefresh = Annotated[int, Depends(resolve_token_by_type(TokenType.REFRESH))]


async def get_current_user(uid: UidByAccess, db: DBDep) -> User:
    try:
        return await AuthService(db).get_profile(uid=uid)
    except UserNotFoundError as exc:
        raise UserNotFoundHTTPError from exc


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_any_role(*roles: str) -> Callable[[CurrentUser], User]:
    async def dependency(user: CurrentUser) -> User:
        if "superuser" in user.role_names or any(role in user.role_names for role in roles):
            return user
        raise NotEnoughPermissionsHTTPError

    return dependency


def require_role(role: str) -> Callable[[CurrentUser], User]:
    return require_any_role(role)
