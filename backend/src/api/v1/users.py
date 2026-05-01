from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.auth import User, UserRole
from src.schemas.auth import UserDTO

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_any_role("admin", "superuser"))])


@router.get("", response_model=list[UserDTO])
async def list_users(db: DBDep) -> list[User]:
    result = await db.session.execute(select(User).options(selectinload(User.role_links).selectinload(UserRole.role)).order_by(User.id))
    return list(result.scalars().unique().all())


@router.get("/{user_id}", response_model=UserDTO)
async def get_user(db: DBDep, user_id: int) -> User:
    result = await db.session.execute(
        select(User).options(selectinload(User.role_links).selectinload(UserRole.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
