from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import Excursion, GuideSession, Route, RoutePoint
from src.schemas.domain import ExcursionCreate, ExcursionRead, ExcursionUpdate

router = APIRouter(prefix="/excursions", tags=["excursions"])
admin_dep = Depends(require_any_role("manager", "admin", "superuser"))


@router.get("", response_model=list[ExcursionRead])
async def list_excursions(db: DBDep, public_only: bool = True, offset: int = 0, limit: int = 100) -> list[Excursion]:
    query = (
        select(Excursion)
        .options(
            selectinload(Excursion.route).selectinload(Route.points).selectinload(RoutePoint.point),
            selectinload(Excursion.sessions),
        )
        .order_by(Excursion.id.desc())
        .offset(offset)
        .limit(limit)
    )
    if public_only:
        query = query.where(Excursion.active.is_(True))
    result = await db.session.execute(query)
    return list(result.scalars().unique().all())


@router.post("", response_model=ExcursionRead, dependencies=[admin_dep])
async def create_excursion(db: DBDep, data: ExcursionCreate) -> Excursion:
    excursion = Excursion(**data.model_dump())
    db.session.add(excursion)
    await db.commit()
    return await _load_excursion(db, excursion.id)


@router.get("/{excursion_id}", response_model=ExcursionRead)
async def get_excursion(db: DBDep, excursion_id: int) -> Excursion:
    excursion = await _load_excursion(db, excursion_id)
    if excursion is None:
        raise HTTPException(status_code=404, detail="Excursion not found")
    return excursion


@router.put("/{excursion_id}", response_model=ExcursionRead, dependencies=[admin_dep])
async def update_excursion(db: DBDep, excursion_id: int, data: ExcursionUpdate) -> Excursion:
    excursion = await db.session.get(Excursion, excursion_id)
    if excursion is None:
        raise HTTPException(status_code=404, detail="Excursion not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(excursion, key, value)
    await db.commit()
    return await _load_excursion(db, excursion_id)


@router.delete("/{excursion_id}", dependencies=[admin_dep])
async def delete_excursion(db: DBDep, excursion_id: int) -> dict[str, str]:
    excursion = await db.session.get(Excursion, excursion_id)
    if excursion is None:
        raise HTTPException(status_code=404, detail="Excursion not found")
    await db.session.delete(excursion)
    await db.commit()
    return {"detail": "Excursion deleted"}


async def _load_excursion(db: DBDep, excursion_id: int) -> Excursion | None:
    result = await db.session.execute(
        select(Excursion)
        .options(
            selectinload(Excursion.route).selectinload(Route.points).selectinload(RoutePoint.point),
            selectinload(Excursion.sessions),
        )
        .where(Excursion.id == excursion_id)
    )
    return result.scalar_one_or_none()
