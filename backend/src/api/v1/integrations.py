from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import require_any_role
from src.api.v1.dependencies.db import DBDep
from src.config import settings
from src.models.domain import Excursion, Route, RoutePoint
from src.schemas.domain import GeneratedDescriptionRead, ImportOSMRequest, IntegrationHealth, PointRead
from src.services.llm_description_service import LLMDescriptionService
from src.services.osm_import_service import OSMImportService

router = APIRouter(prefix="/integrations", tags=["integrations"])
staff_dep = Depends(require_any_role("it_specialist", "manager", "admin", "superuser"))


@router.get("/health", response_model=list[IntegrationHealth], dependencies=[staff_dep])
async def integration_health() -> list[IntegrationHealth]:
    return [
        IntegrationHealth(
            name="osrm",
            enabled=settings.enable_route_generation,
            ok=True,
            detail="Маршрутизация включена" if settings.enable_route_generation else "Автоматический расчёт маршрута отключён",
            url=settings.osrm_base_url,
        ),
        IntegrationHealth(
            name="llm",
            enabled=settings.enable_llm_description,
            ok=True,
            detail="Генерация описаний включена" if settings.enable_llm_description else "Генерация описаний отключена",
            url=settings.ollama_base_url,
            model=settings.ollama_model,
        ),
        IntegrationHealth(
            name="fact_search",
            enabled=settings.enable_web_fact_search,
            ok=True,
            detail="Поиск фактов включён" if settings.enable_web_fact_search else "Поиск фактов отключён",
        ),
        IntegrationHealth(
            name="osm_import",
            enabled=settings.enable_osm_import,
            ok=True,
            detail="Импорт точек OSM включён" if settings.enable_osm_import else "Импорт точек OSM отключён",
            url=settings.overpass_url,
        ),
    ]


@router.post("/osm/import", response_model=list[PointRead], dependencies=[staff_dep])
async def import_osm_points(db: DBDep, data: ImportOSMRequest) -> list:
    return await OSMImportService(db).import_points(data)


@router.post("/routes/{route_id}/generate-description", response_model=GeneratedDescriptionRead, dependencies=[staff_dep])
async def generate_description(db: DBDep, route_id: int) -> GeneratedDescriptionRead:
    result = await db.session.execute(select(Route).options(selectinload(Route.points).selectinload(RoutePoint.point)).where(Route.id == route_id))
    route = result.scalar_one()
    text, sources = await LLMDescriptionService(db).generate_for_route(route)
    return GeneratedDescriptionRead(text=text, sources=sources)


@router.post("/excursions/{excursion_id}/generate-description", response_model=GeneratedDescriptionRead, dependencies=[staff_dep])
async def generate_excursion_description(db: DBDep, excursion_id: int) -> GeneratedDescriptionRead:
    result = await db.session.execute(
        select(Excursion)
        .options(selectinload(Excursion.route).selectinload(Route.points).selectinload(RoutePoint.point))
        .where(Excursion.id == excursion_id)
    )
    excursion = result.scalar_one_or_none()
    if excursion is None:
        raise HTTPException(status_code=404, detail="Excursion not found")
    if excursion.route is None:
        raise HTTPException(status_code=400, detail="Excursion has no route")
    text, sources = await LLMDescriptionService(db).generate_for_route(excursion.route)
    excursion.description = text
    await db.commit()
    return GeneratedDescriptionRead(text=text, sources=sources)
