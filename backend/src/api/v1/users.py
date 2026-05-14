from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.auth import Role, User, UserRole
from src.schemas.auth import AdminUserUpdateDTO, RoleDTO, UserCreateDTO, UserDTO, UserPasswordUpdateDTO, UserRolesUpdateDTO
from src.services.auth import TokenService, ensure_roles

router = APIRouter(prefix="/users", tags=["users"])
read_dep = Depends(require_any_role("admin", "superuser", "it_specialist"))
write_dep = Depends(require_any_role("admin", "superuser"))


@router.get("/roles", response_model=list[RoleDTO], dependencies=[read_dep])
async def list_roles(db: DBDep) -> list[Role]:
    await ensure_roles(db)
    result = await db.session.execute(select(Role).order_by(Role.id))
    return list(result.scalars().all())


@router.get("", response_model=list[UserDTO], dependencies=[read_dep])
async def list_users(db: DBDep) -> list[User]:
    result = await db.session.execute(select(User).options(selectinload(User.role_links).selectinload(UserRole.role)).order_by(User.id))
    return list(result.scalars().unique().all())


@router.post("", response_model=UserDTO, status_code=201, dependencies=[write_dep])
async def create_user(db: DBDep, data: UserCreateDTO) -> User:
    await ensure_roles(db)
    user = User(
        email=str(data.email),
        username=data.username,
        first_name=data.first_name or "",
        last_name=data.last_name or "",
        middle_name=data.middle_name,
        full_name=data.full_name or _build_full_name(data.first_name, data.last_name, data.middle_name),
        phone=data.phone,
        password_hash=TokenService(db).hash_pwd(data.password),
        active=data.active,
    )
    try:
        db.session.add(user)
        await db.session.flush()
        await _replace_user_roles(db, user.id, [role.value for role in data.roles])
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="User already exists") from exc
    return await _get_user(db, user.id)


@router.get("/{user_id}", response_model=UserDTO, dependencies=[read_dep])
async def get_user(db: DBDep, user_id: int) -> User:
    return await _get_user(db, user_id)


@router.put("/{user_id}", response_model=UserDTO, dependencies=[write_dep])
async def update_user(db: DBDep, user_id: int, data: AdminUserUpdateDTO) -> User:
    user = await _get_user(db, user_id)
    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(user, key, value)
    if "full_name" not in payload:
        user.full_name = _build_full_name(user.first_name, user.last_name, user.middle_name)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="User already exists") from exc
    return await _get_user(db, user_id)


@router.put("/{user_id}/roles", response_model=UserDTO, dependencies=[write_dep])
async def update_user_roles(db: DBDep, user_id: int, data: UserRolesUpdateDTO) -> User:
    await _get_user(db, user_id)
    await _replace_user_roles(db, user_id, [role.value for role in data.roles])
    await db.commit()
    return await _get_user(db, user_id)


@router.put("/{user_id}/password", response_model=UserDTO, dependencies=[write_dep])
async def update_user_password(db: DBDep, user_id: int, data: UserPasswordUpdateDTO) -> User:
    user = await _get_user(db, user_id)
    user.password_hash = TokenService(db).hash_pwd(data.password)
    await db.commit()
    return await _get_user(db, user_id)


async def _get_user(db: DBDep, user_id: int) -> User:
    result = await db.session.execute(
        select(User).options(selectinload(User.role_links).selectinload(UserRole.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def _replace_user_roles(db: DBDep, user_id: int, role_names: list[str]) -> None:
    await ensure_roles(db)
    result = await db.session.execute(select(Role).where(Role.name.in_(role_names)))
    roles = list(result.scalars().all())
    found = {role.name for role in roles}
    missing = set(role_names) - found
    if missing:
        raise HTTPException(status_code=422, detail=f"Unknown roles: {', '.join(sorted(missing))}")
    await db.session.execute(delete(UserRole).where(UserRole.user_id == user_id))
    for role in roles:
        db.session.add(UserRole(user_id=user_id, role_id=role.id))
    await db.session.flush()


def _build_full_name(first_name: str | None, last_name: str | None, middle_name: str | None = None) -> str:
    return " ".join(part for part in (last_name, first_name, middle_name) if part).strip()
