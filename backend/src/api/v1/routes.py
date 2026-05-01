from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import Route, RoutePoint
from src.schemas.domain import RouteCreate, RouteGenerateRequest, RouteRead, RouteUpdate
from src.services.route_service import RouteService

router = APIRouter(prefix="/routes", tags=["routes"])
admin_dep = Depends(require_any_role("manager", "admin", "superuser"))


@router.get("", response_model=list[RouteRead])
async def list_routes(db: DBDep, offset: int = 0, limit: int = 100) -> list[Route]:
    result = await db.session.execute(
        select(Route).options(selectinload(Route.points).selectinload(RoutePoint.point)).order_by(Route.id.desc()).offset(offset).limit(limit)
    )
    return list(result.scalars().unique().all())


@router.post("", response_model=RouteRead, dependencies=[admin_dep])
async def create_route(db: DBDep, data: RouteCreate) -> Route:
    route = Route(**data.model_dump(exclude={"points"}))
    db.session.add(route)
    await db.session.flush()
    for item in data.points:
        db.session.add(RoutePoint(route_id=route.id, **item.model_dump()))
    await db.commit()
    return await RouteService(db).get_route(route.id)


@router.post("/generate", response_model=RouteRead, dependencies=[admin_dep])
async def generate_route(db: DBDep, data: RouteGenerateRequest) -> Route:
    try:
        return await RouteService(db).generate_route(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{route_id}", response_model=RouteRead)
async def get_route(db: DBDep, route_id: int) -> Route:
    try:
        return await RouteService(db).get_route(route_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{route_id}", response_model=RouteRead, dependencies=[admin_dep])
async def update_route(db: DBDep, route_id: int, data: RouteUpdate) -> Route:
    route = await db.session.get(Route, route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    payload = data.model_dump(exclude_unset=True, exclude={"points"})
    for key, value in payload.items():
        setattr(route, key, value)
    if data.points is not None:
        await db.session.execute(delete(RoutePoint).where(RoutePoint.route_id == route_id))
        await db.session.flush()
        for item in data.points:
            db.session.add(RoutePoint(route_id=route.id, **item.model_dump()))
    await db.commit()
    return await RouteService(db).get_route(route_id)


@router.delete("/{route_id}", dependencies=[admin_dep])
async def delete_route(db: DBDep, route_id: int) -> dict[str, str]:
    route = await db.session.get(Route, route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    await db.session.delete(route)
    await db.commit()
    return {"detail": "Route deleted"}
