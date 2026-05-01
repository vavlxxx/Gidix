from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Response
from jwt.exceptions import DecodeError, ExpiredSignatureError
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from src.config import settings
from src.models.auth import Role, Token, User, UserRole as UserRoleModel
from src.schemas.auth import (
    CreatedTokenDTO,
    RoleName,
    TokenResponseDTO,
    TokenType,
    UserDTO,
    UserLoginDTO,
    UserRegisterDTO,
    UserUpdateDTO,
)
from src.services.base import BaseService
from src.utils.db_tools import DBManager
from src.utils.exceptions import (
    CannotDecodeTokenError,
    InvalidLoginDataError,
    ObjectAlreadyExistsError,
    ObjectNotFoundError,
    TokenExipedError,
    UserExistsHTTPError,
    UserNotFoundError,
)


class TokenService(BaseService):
    def __init__(self, db: DBManager | None = None) -> None:
        super().__init__(db=db)

    def hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def verify_token(self, token: str, hashed_token: str) -> bool:
        return self.hash_token(token) == hashed_token

    def hash_pwd(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify_pwd(self, password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

    def _generate_token(self, payload: dict, expires_delta: timedelta, token_type: TokenType) -> CreatedTokenDTO:
        now = datetime.now(timezone.utc)
        expires = now + expires_delta
        token_data = {
            **payload,
            "exp": expires,
            "iat": now,
            "type": token_type.value,
        }
        token = jwt.encode(
            payload=token_data,
            key=settings.auth.JWT_SECRET.get_secret_value(),
            algorithm=settings.auth.JWT_ALGORITHM,
        )
        return CreatedTokenDTO(token=token, expires_at=expires, type=token_type)

    def create_access_token(self, payload: dict) -> CreatedTokenDTO:
        return self._generate_token(
            payload=payload,
            expires_delta=timedelta(minutes=settings.auth.JWT_EXPIRE_DELTA_ACCESS_MINUTES),
            token_type=TokenType.ACCESS,
        )

    def create_refresh_token(self, payload: dict) -> CreatedTokenDTO:
        return self._generate_token(
            payload=payload,
            expires_delta=timedelta(days=settings.auth.JWT_EXPIRE_DELTA_REFRESH_DAYS),
            token_type=TokenType.REFRESH,
        )

    def decode_token(self, token: str) -> dict:
        try:
            return jwt.decode(
                jwt=token,
                key=settings.auth.JWT_SECRET.get_secret_value(),
                algorithms=[settings.auth.JWT_ALGORITHM],
            )
        except ExpiredSignatureError as exc:
            raise TokenExipedError from exc
        except DecodeError as exc:
            raise CannotDecodeTokenError from exc

    async def update_tokens(self, response: Response, uid: int | None = None, user: User | None = None) -> TokenResponseDTO:
        if user is None:
            if uid is None or self.db is None:
                raise UserNotFoundError
            user = await _get_user_by_id(self.db, uid)

        roles = user.role_names
        access_token = self.create_access_token(payload={"sub": str(user.id), "email": user.email, "roles": roles})
        refresh_token = self.create_refresh_token(payload={"sub": str(user.id)})

        await self.db.session.execute(delete(Token).where(Token.user_id == user.id, Token.type == TokenType.REFRESH.value))
        self.db.session.add(
            Token(
                user_id=user.id,
                type=TokenType.REFRESH.value,
                hashed_data=self.hash_token(refresh_token.token),
                expires_at=refresh_token.expires_at,
            )
        )
        await self.db.commit()

        response.set_cookie(
            key=settings.auth.REFRESH_TOKEN_COOKIE_KEY,
            value=refresh_token.token,
            httponly=True,
            samesite="lax",
        )
        return TokenResponseDTO(access_token=access_token.token, refresh_token=refresh_token.token)

    async def verify_persisted_refresh(self, uid: int, token: str) -> None:
        result = await self.db.session.execute(select(Token).where(Token.user_id == uid, Token.type == TokenType.REFRESH.value))
        persisted = result.scalar_one_or_none()
        if persisted is None or not self.verify_token(token, persisted.hashed_data):
            raise ObjectNotFoundError

    async def delete_tokens(self, uid: int) -> None:
        await self.db.session.execute(delete(Token).where(Token.user_id == uid))
        await self.db.commit()


class AuthService(BaseService):
    def __init__(self, db: DBManager | None = None) -> None:
        super().__init__(db=db)

    async def login_user(self, login_data: UserLoginDTO, response: Response) -> TokenResponseDTO:
        user = await _get_user_by_identity(self.db, email=str(login_data.email) if login_data.email else None, username=login_data.username)
        if user is None or not user.active:
            raise InvalidLoginDataError
        if not TokenService(self.db).verify_pwd(login_data.password, user.password_hash):
            raise InvalidLoginDataError

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.commit()
        return await TokenService(self.db).update_tokens(user=user, response=response)

    async def register_user(self, register_data: UserRegisterDTO) -> UserDTO:
        email = str(register_data.email) if register_data.email else f"{register_data.username}@local.gidix"
        full_name = _build_full_name(register_data.first_name, register_data.last_name, register_data.middle_name)
        user = User(
            email=email,
            username=register_data.username,
            first_name=register_data.first_name or "",
            last_name=register_data.last_name or "",
            middle_name=register_data.middle_name,
            full_name=full_name,
            phone=register_data.phone,
            password_hash=TokenService(self.db).hash_pwd(register_data.password),
            active=True,
        )
        try:
            self.db.session.add(user)
            await self.db.session.flush()
            await _assign_role(self.db, user, RoleName.CLIENT.value)
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise UserExistsHTTPError from exc
        return UserDTO.model_validate(await _get_user_by_id(self.db, user.id))

    async def get_profile(self, uid: int) -> User:
        return await _get_user_by_id(self.db, uid)

    async def update_profile(self, uid: int, data: UserUpdateDTO) -> UserDTO:
        user = await _get_user_by_id(self.db, uid)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(user, key, value)
        user.full_name = _build_full_name(user.first_name, user.last_name, user.middle_name)
        await self.db.commit()
        await self.db.session.refresh(user)
        return UserDTO.model_validate(user)


async def ensure_roles(db: DBManager) -> None:
    for role in RoleName:
        result = await db.session.execute(select(Role).where(Role.name == role.value))
        if result.scalar_one_or_none() is None:
            db.session.add(Role(name=role.value, description=role.value.replace("_", " ").title()))
    await db.commit()


async def _assign_role(db: DBManager, user: User, role_name: str) -> None:
    await ensure_roles(db)
    result = await db.session.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one()
    db.session.add(UserRoleModel(user_id=user.id, role_id=role.id, assigned_at=datetime.now(timezone.utc)))
    await db.session.flush()


async def _get_user_by_id(db: DBManager, uid: int) -> User:
    result = await db.session.execute(
        select(User).options(selectinload(User.role_links).selectinload(UserRoleModel.role)).where(User.id == uid)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise UserNotFoundError
    return user


async def _get_user_by_identity(db: DBManager, email: str | None = None, username: str | None = None) -> User | None:
    query = select(User).options(selectinload(User.role_links).selectinload(UserRoleModel.role))
    if email:
        query = query.where(User.email == email)
    elif username:
        query = query.where(User.username == username)
    else:
        return None
    result = await db.session.execute(query)
    return result.scalar_one_or_none()


def _build_full_name(first_name: str | None, last_name: str | None, middle_name: str | None = None) -> str:
    return " ".join(part for part in (last_name, first_name, middle_name) if part).strip()
