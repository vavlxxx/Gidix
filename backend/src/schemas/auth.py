from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import EmailStr, Field, model_validator

from src.schemas.base import BaseDTO


class RoleName(str, Enum):
    CLIENT = "client"
    DISPATCHER = "dispatcher"
    MANAGER = "manager"
    ACCOUNTANT = "accountant"
    GUIDE = "guide"
    ADMIN = "admin"
    IT_SPECIALIST = "it_specialist"
    SUPERUSER = "superuser"


class UserRole(str, Enum):
    SUPERUSER = "superuser"
    ADMIN = "admin"
    USER = "client"


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


class UserLoginDTO(BaseDTO):
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=4, max_length=64)
    password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def require_identity(self) -> "UserLoginDTO":
        if not self.email and not self.username:
            raise ValueError("Provide email or username")
        return self


class UserRegisterDTO(BaseDTO):
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=4, max_length=64)
    password: str = Field(..., min_length=8)
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)

    @model_validator(mode="after")
    def normalize_identity(self) -> "UserRegisterDTO":
        if not self.email and not self.username:
            raise ValueError("Provide email or username")
        return self


class UserAddDTO(BaseDTO):
    email: EmailStr
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    full_name: str = ""
    phone: str | None = None
    password_hash: str
    active: bool = True


class RoleDTO(BaseDTO):
    id: int
    name: str
    description: str | None = None


class UserDTO(BaseDTO):
    id: int
    email: EmailStr
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    full_name: str = ""
    phone: str | None = None
    active: bool
    last_login_at: datetime | None = None
    roles: list[str] = []

    @model_validator(mode="before")
    @classmethod
    def from_model(cls, data: Any) -> Any:
        if hasattr(data, "role_names"):
            payload = data.to_dict()
            payload["roles"] = data.role_names
            payload["first_name"] = payload["first_name"] or None
            payload["last_name"] = payload["last_name"] or None
            return payload
        return data


class UserUpdateDTO(BaseDTO):
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=4, max_length=64)
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    active: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def check_atleast_one_field_provided(cls, data: Any) -> Any:
        if not any(value is not None and value != "" for value in data.values()):
            raise ValueError("Provide at least one field for update")
        return data


class UserWithPasswordDTO(UserDTO):
    password_hash: str


class CreatedTokenDTO(BaseDTO):
    type: TokenType
    token: str
    expires_at: datetime


class TokenAddDTO(BaseDTO):
    user_id: int
    type: str
    hashed_data: str
    expires_at: datetime


class TokenUpdateDTO(BaseDTO):
    expires_at: datetime


class TokenDTO(TokenAddDTO):
    id: int


class TokenResponseDTO(BaseDTO):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    type: str = "Bearer"
