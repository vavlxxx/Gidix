from __future__ import annotations

from fastapi import APIRouter, Body, Response

from src.api.v1.dependencies.auth import UidByAccess, UidByRefresh
from src.api.v1.dependencies.db import DBDep
from src.config import settings
from src.schemas.auth import TokenResponseDTO, UserDTO, UserLoginDTO, UserRegisterDTO, UserUpdateDTO
from src.services.auth import AuthService, TokenService
from src.utils.exceptions import (
    InvalidLoginDataError,
    InvalidLoginDataHTTPError,
    UserExistsHTTPError,
    UserNotFoundError,
    UserNotFoundHTTPError,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponseDTO)
async def login(db: DBDep, response: Response, login_data: UserLoginDTO = Body(...)) -> TokenResponseDTO:
    try:
        return await AuthService(db).login_user(login_data=login_data, response=response)
    except InvalidLoginDataError as exc:
        raise InvalidLoginDataHTTPError from exc


@router.post("/login/", response_model=TokenResponseDTO, include_in_schema=False)
async def login_slash(db: DBDep, response: Response, login_data: UserLoginDTO = Body(...)) -> TokenResponseDTO:
    return await login(db, response, login_data)


@router.post("/register", response_model=UserDTO)
async def register(db: DBDep, register_data: UserRegisterDTO = Body(...)) -> UserDTO:
    try:
        return await AuthService(db).register_user(register_data=register_data)
    except UserExistsHTTPError:
        raise


@router.post("/register/", response_model=UserDTO, include_in_schema=False)
async def register_slash(db: DBDep, register_data: UserRegisterDTO = Body(...)) -> UserDTO:
    return await register(db, register_data)


@router.post("/refresh", response_model=TokenResponseDTO)
async def refresh(db: DBDep, uid: UidByRefresh, response: Response) -> TokenResponseDTO:
    return await TokenService(db).update_tokens(uid=uid, response=response)


@router.post("/refresh/", response_model=TokenResponseDTO, include_in_schema=False)
async def refresh_slash(db: DBDep, uid: UidByRefresh, response: Response) -> TokenResponseDTO:
    return await refresh(db, uid, response)


@router.post("/logout")
async def logout(uid: UidByRefresh, db: DBDep, response: Response) -> dict[str, str]:
    await TokenService(db).delete_tokens(uid=uid)
    response.delete_cookie(settings.auth.REFRESH_TOKEN_COOKIE_KEY, httponly=True)
    return {"detail": "Successfully logged out"}


@router.get("/profile", response_model=UserDTO)
async def get_profile(db: DBDep, uid: UidByAccess) -> UserDTO:
    try:
        return UserDTO.model_validate(await AuthService(db).get_profile(uid=uid))
    except UserNotFoundError as exc:
        raise UserNotFoundHTTPError from exc


@router.get("/profile/", response_model=UserDTO, include_in_schema=False)
async def get_profile_slash(db: DBDep, uid: UidByAccess) -> UserDTO:
    return await get_profile(db, uid)


@router.put("/profile", response_model=UserDTO)
async def update_profile(db: DBDep, uid: UidByAccess, data: UserUpdateDTO = Body(...)) -> UserDTO:
    return await AuthService(db).update_profile(uid=uid, data=data)
