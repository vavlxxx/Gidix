from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import Route, RoutePoint
from src.schemas.domain import (
    RouteBuildPlanRequest,
    RouteCreate,
    RouteGenerateRequest,
    RouteGeometryUpdate,
    RoutePointIn,
    RoutePreviewRead,
    RoutePreviewRoadRequest,
    RouteRead,
    RouteUpdate,
)
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
    await db.session.flush()
    if data.geometry_geojson:
        _apply_order_metadata(route, data.points)
    elif len(data.points) >= 2:
        await _try_apply_ordered_geometry(db, route, data.points)
    await db.commit()
    return await RouteService(db).get_route(route.id)


@router.post("/generate", response_model=RouteRead, dependencies=[admin_dep])
async def generate_route(db: DBDep, data: RouteGenerateRequest) -> Route:
    try:
        return await RouteService(db).generate_route(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/preview-road", response_model=RoutePreviewRead, dependencies=[admin_dep])
async def preview_road_route(db: DBDep, data: RoutePreviewRoadRequest) -> RoutePreviewRead:
    try:
        plan = await RouteService(db).preview_road(data)
        return _plan_preview(plan)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/build-plan", response_model=RouteRead, dependencies=[admin_dep])
async def build_route_plan(db: DBDep, data: RouteBuildPlanRequest) -> Route:
    try:
        return await RouteService(db).create_built_route(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/preview", response_model=RoutePreviewRead, dependencies=[admin_dep])
async def preview_route(db: DBDep, data: RouteGenerateRequest) -> RoutePreviewRead:
    try:
        plan = await RouteService(db).preview_road(RoutePreviewRoadRequest(point_ids=data.point_ids, preserve_order=True))
        return _plan_preview(plan)
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
        await db.session.flush()
        if data.geometry_geojson is not None:
            _apply_order_metadata(route, data.points)
        elif len(data.points) >= 2:
            await _try_apply_ordered_geometry(db, route, data.points)
        else:
            route.geometry_geojson = None
            route.estimated_length_km = None
            route.estimated_duration_min = None
    point_exists = await db.session.scalar(select(RoutePoint.id).where(RoutePoint.route_id == route_id).limit(1))
    if point_exists is None:
        raise HTTPException(status_code=400, detail="Route must include at least one point")
    await db.commit()
    return await RouteService(db).get_route(route_id)


@router.put("/{route_id}/geometry", response_model=RouteRead, dependencies=[admin_dep])
async def update_route_geometry(db: DBDep, route_id: int, data: RouteGeometryUpdate) -> Route:
    route = await db.session.get(Route, route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    route.geometry_geojson = data.geometry_geojson
    route.route_metadata = {
        **(route.route_metadata or {}),
        "geometry_format": "geojson",
        "geometry_source": "custom" if data.is_geometry_customized else "road",
        "manual_geometry_edited": data.is_geometry_customized,
        "last_geometry_saved_at": datetime.utcnow().isoformat(),
    }
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


async def _try_apply_ordered_geometry(db: DBDep, route: Route, points: list[RoutePointIn]) -> None:
    ordered = sorted(points, key=lambda item: item.position)
    route.start_point_id = ordered[0].point_id
    route.finish_point_id = ordered[-1].point_id
    try:
        plan = await RouteService(db).preview_road(RoutePreviewRoadRequest(point_ids=[item.point_id for item in ordered], preserve_order=True))
    except ValueError as exc:
        route.geometry_geojson = None
        route.route_metadata = {
            **(route.route_metadata or {}),
            "geometry_format": "geojson",
            "manual_geometry_edited": False,
            "last_build_error": str(exc),
        }
        return
    route.estimated_duration_min = round(plan.duration / 60)
    route.estimated_length_km = round(plan.distance / 1000, 2)
    route.geometry_geojson = plan.geometry
    route.route_metadata = {
        **(route.route_metadata or {}),
        "geometry_format": "geojson",
        "geometry_source": "road",
        "manual_geometry_edited": False,
        "distance_meters": plan.distance,
        "duration_seconds": plan.duration,
        "snapped_points": plan.snapped_points,
        "last_built_at": datetime.utcnow().isoformat(),
    }


def _apply_order_metadata(route: Route, points: list[RoutePointIn] | None) -> None:
    if not points:
        return
    ordered = sorted(points, key=lambda item: item.position)
    route.start_point_id = ordered[0].point_id
    route.finish_point_id = ordered[-1].point_id
    route.route_metadata = {
        **(route.route_metadata or {}),
        "geometry_format": "geojson",
    }


def _plan_preview(plan) -> RoutePreviewRead:
    return RoutePreviewRead(
        geometry_geojson=plan.geometry,
        estimated_duration_min=round(plan.duration / 60),
        estimated_length_km=round(plan.distance / 1000, 2),
        points=[
            RoutePointIn(point_id=point.id, position=index + 1, visit_duration_min=point.visit_duration_min)
            for index, point in enumerate(plan.ordered_points)
        ],
        snapped_points=plan.snapped_points,
    )
