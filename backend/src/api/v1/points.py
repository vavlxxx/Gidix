from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import PointCategory, PointOfInterest
from src.schemas.domain import PointCategoryCreate, PointCategoryRead, PointCreate, PointRead, PointUpdate

router = APIRouter(prefix="/points", tags=["points"])
admin_dep = Depends(require_any_role("it_specialist", "manager", "admin", "superuser"))


@router.get("/categories", response_model=list[PointCategoryRead])
async def list_categories(db: DBDep) -> list[PointCategory]:
    result = await db.session.execute(select(PointCategory).order_by(PointCategory.name))
    return list(result.scalars().all())


@router.post("/categories", response_model=PointCategoryRead, dependencies=[admin_dep])
async def create_category(db: DBDep, data: PointCategoryCreate) -> PointCategory:
    category = PointCategory(**data.model_dump())
    db.session.add(category)
    await db.commit()
    await db.session.refresh(category)
    return category


@router.get("", response_model=list[PointRead])
async def list_points(db: DBDep, offset: int = 0, limit: int = 100) -> list[PointOfInterest]:
    result = await db.session.execute(select(PointOfInterest).order_by(PointOfInterest.name).offset(offset).limit(limit))
    return list(result.scalars().all())


@router.post("", response_model=PointRead, dependencies=[admin_dep])
async def create_point(db: DBDep, data: PointCreate) -> PointOfInterest:
    point = PointOfInterest(**data.model_dump())
    db.session.add(point)
    await db.commit()
    await db.session.refresh(point)
    return point


@router.get("/{point_id}", response_model=PointRead)
async def get_point(db: DBDep, point_id: int) -> PointOfInterest:
    point = await db.session.get(PointOfInterest, point_id)
    if point is None:
        raise HTTPException(status_code=404, detail="Point not found")
    return point


@router.put("/{point_id}", response_model=PointRead, dependencies=[admin_dep])
async def update_point(db: DBDep, point_id: int, data: PointUpdate) -> PointOfInterest:
    point = await db.session.get(PointOfInterest, point_id)
    if point is None:
        raise HTTPException(status_code=404, detail="Point not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(point, key, value)
    await db.commit()
    await db.session.refresh(point)
    return point


@router.delete("/{point_id}", dependencies=[admin_dep])
async def delete_point(db: DBDep, point_id: int) -> dict[str, str]:
    point = await db.session.get(PointOfInterest, point_id)
    if point is None:
        raise HTTPException(status_code=404, detail="Point not found")
    await db.session.delete(point)
    await db.commit()
    return {"detail": "Point deleted"}
