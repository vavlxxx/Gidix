from __future__ import annotations

import time
from dataclasses import dataclass
from itertools import permutations
from math import atan2, cos, radians, sin, sqrt
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.config import settings
from src.models.domain import PointOfInterest, Route, RoutePoint
from src.schemas.domain import RouteBuildPlanRequest, RouteGenerateRequest, RoutePreviewRoadRequest
from src.utils.db_tools import DBManager


ROAD_ROUTE_ERROR = "Не удалось построить маршрут по дорожной сети."
SNAP_ERROR = "Не удалось привязать точку к дорожной сети."


@dataclass(frozen=True)
class OptimizationResult:
    order: list[int]
    cost: float
    algorithm: str
    elapsed_seconds: float
    checked_variants: int | None = None


@dataclass(frozen=True)
class RoutePlanResult:
    geometry: dict[str, Any]
    ordered_points: list[PointOfInterest]
    distance: float
    duration: float
    snapped_points: list[dict[str, Any]]
    source: str = "road"
    optimization: OptimizationResult | None = None


class RouteService:
    def __init__(self, db: DBManager) -> None:
        self.db = db

    async def generate_route(self, data: RouteGenerateRequest) -> Route:
        plan = await self.build_plan(
            RouteBuildPlanRequest(
                title=data.title,
                point_ids=data.point_ids,
                start_point_id=data.start_point_id,
                finish_point_id=data.finish_point_id,
            )
        )
        route = await self._create_route_from_plan(data.title, None, plan)
        await self.db.commit()
        return await self.get_route(route.id)

    async def preview_road(self, data: RoutePreviewRoadRequest) -> RoutePlanResult:
        return await self._build_plan(
            point_ids=data.point_ids,
            preserve_order=data.preserve_order,
            start_point_id=data.start_point_id,
            finish_point_id=data.finish_point_id,
        )

    async def build_plan(self, data: RouteBuildPlanRequest) -> RoutePlanResult:
        return await self._build_plan(
            point_ids=data.point_ids,
            preserve_order=False,
            start_point_id=data.start_point_id,
            finish_point_id=data.finish_point_id,
        )

    async def create_built_route(self, data: RouteBuildPlanRequest) -> Route:
        plan = await self.build_plan(data)
        route = await self._create_route_from_plan(data.title, data.description, plan)
        await self.db.commit()
        return await self.get_route(route.id)

    async def get_route(self, route_id: int) -> Route:
        result = await self.db.session.execute(
            select(Route).options(selectinload(Route.points).selectinload(RoutePoint.point)).where(Route.id == route_id)
        )
        route = result.scalar_one_or_none()
        if route is None:
            raise ValueError("Route not found")
        return route

    async def _create_route_from_plan(self, title: str, description: str | None, plan: RoutePlanResult) -> Route:
        route = Route(
            title=title,
            description=description,
            start_point_id=plan.ordered_points[0].id,
            finish_point_id=plan.ordered_points[-1].id,
            estimated_duration_min=round(plan.duration / 60),
            estimated_length_km=round(plan.distance / 1000, 2),
            formation_type="road_plan",
            optimization_algorithm=plan.optimization.algorithm if plan.optimization else None,
            geometry_geojson=plan.geometry,
            route_metadata=_route_metadata(plan, manual_geometry_edited=False),
        )
        self.db.session.add(route)
        await self.db.session.flush()
        for position, point in enumerate(plan.ordered_points, start=1):
            self.db.session.add(
                RoutePoint(
                    route_id=route.id,
                    point_id=point.id,
                    position=position,
                    visit_duration_min=point.visit_duration_min,
                )
            )
        await self.db.session.flush()
        return route

    async def _build_plan(
        self,
        point_ids: list[int],
        preserve_order: bool,
        start_point_id: int | None = None,
        finish_point_id: int | None = None,
    ) -> RoutePlanResult:
        points = await self._load_points(point_ids)
        if len(points) < 2:
            raise ValueError("At least two points are required")
        start_index = _index_by_point_id(points, start_point_id) if start_point_id else 0
        finish_index = _index_by_point_id(points, finish_point_id) if finish_point_id else len(points) - 1

        if preserve_order:
            ordered_points = points
            optimization = None
        else:
            optimization = await self._optimize_order(points, start_index, finish_index)
            ordered_points = [points[index] for index in optimization.order]

        route_data = await self._get_route(ordered_points, strict=True)
        return RoutePlanResult(
            geometry=route_data["geometry"],
            ordered_points=ordered_points,
            distance=route_data["distance"],
            duration=route_data["duration"],
            snapped_points=route_data.get("snapped_points", []),
            optimization=optimization,
        )

    async def _optimize_order(self, points: list[PointOfInterest], start_index: int, finish_index: int) -> OptimizationResult:
        table = await self._get_table(points)
        algorithm = settings.route_optimization_default
        return find_best_order(table["durations"], start_index, finish_index, algorithm)

    async def _load_points(self, point_ids: list[int]) -> list[PointOfInterest]:
        result = await self.db.session.execute(select(PointOfInterest).where(PointOfInterest.id.in_(point_ids)))
        by_id = {point.id: point for point in result.scalars().all()}
        missing = set(point_ids) - set(by_id)
        if missing:
            raise ValueError(f"Points not found: {sorted(missing)}")
        return [by_id[point_id] for point_id in point_ids]

    async def _get_table(self, points: list[PointOfInterest]) -> dict[str, Any]:
        if not settings.enable_route_generation:
            return _fallback_table(points)
        snapped = await self._nearest_points(points, strict=False)
        coordinates = _coordinates_from_snapped(snapped)
        params = {"annotations": "duration,distance"}
        url = f"{settings.osrm_base_url}/table/v1/{settings.osrm_profile}/{coordinates}?{urlencode(params)}"
        try:
            async with httpx.AsyncClient(timeout=settings.osrm_timeout_seconds) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
            if data.get("code") == "Ok":
                return data
        except Exception:
            pass
        return _fallback_table(points)

    async def _get_route(self, points: list[PointOfInterest], strict: bool = False) -> dict[str, Any]:
        if not settings.enable_route_generation:
            return _straight_line_route_or_error(points, strict)
        if len(points) > 40:
            return await self._get_route_chunked(points, strict=strict)

        snapped = await self._nearest_points(points, strict=True)
        coordinates = _coordinates_from_snapped(snapped)
        params = {"overview": "full", "geometries": "geojson", "steps": "false", "annotations": "false"}
        url = f"{settings.osrm_base_url}/route/v1/{settings.osrm_profile}/{coordinates}?{urlencode(params)}"
        try:
            async with httpx.AsyncClient(timeout=settings.osrm_timeout_seconds) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                return {
                    "geometry": route["geometry"],
                    "distance": route["distance"],
                    "duration": route["duration"],
                    "snapped_points": snapped,
                }
        except Exception as exc:
            if strict:
                raise ValueError(ROAD_ROUTE_ERROR) from exc
        return _straight_line_route_or_error(points, strict)

    async def _nearest_points(self, points: list[PointOfInterest], strict: bool) -> list[dict[str, Any]]:
        if not settings.enable_route_generation:
            if strict:
                raise ValueError(ROAD_ROUTE_ERROR)
            return [_point_as_snapped(point, None) for point in points]

        snapped: list[dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=settings.osrm_timeout_seconds) as client:
                for point in points:
                    coordinate = f"{float(point.longitude)},{float(point.latitude)}"
                    url = f"{settings.osrm_base_url}/nearest/v1/{settings.osrm_profile}/{coordinate}?{urlencode({'number': 1})}"
                    response = await client.get(url)
                    response.raise_for_status()
                    data = response.json()
                    waypoints = data.get("waypoints") or []
                    if data.get("code") != "Ok" or not waypoints:
                        raise ValueError(SNAP_ERROR)
                    lon, lat = waypoints[0]["location"]
                    snapped.append(
                        {
                            "point_id": point.id,
                            "longitude": float(lon),
                            "latitude": float(lat),
                            "snap_distance_m": waypoints[0].get("distance"),
                            "snap_source": "road",
                        }
                    )
            return snapped
        except Exception as exc:
            if strict:
                raise ValueError(SNAP_ERROR) from exc
        return [_point_as_snapped(point, None) for point in points]

    async def _get_route_chunked(self, points: list[PointOfInterest], chunk_size: int = 40, strict: bool = False) -> dict[str, Any]:
        all_coordinates: list[list[float]] = []
        all_snapped: list[dict[str, Any]] = []
        total_distance = 0.0
        total_duration = 0.0
        start = 0
        while start < len(points) - 1:
            end = min(start + chunk_size, len(points))
            chunk = points[start:end]
            if len(chunk) < 2:
                break
            route = await self._get_route(chunk, strict=strict)
            coords = route["geometry"]["coordinates"]
            if all_coordinates:
                coords = coords[1:]
            all_coordinates.extend(coords)
            all_snapped.extend(route.get("snapped_points", []))
            total_distance += route["distance"]
            total_duration += route["duration"]
            start = end - 1
        if len(all_coordinates) < 2:
            return _straight_line_route_or_error(points, strict)
        return {
            "geometry": {"type": "LineString", "coordinates": all_coordinates},
            "distance": total_distance,
            "duration": total_duration,
            "snapped_points": all_snapped,
        }


def find_best_order(matrix: list[list[float | None]], start_index: int, finish_index: int, algorithm: str) -> OptimizationResult:
    n = len(matrix)
    if algorithm == "bruteforce" and n <= settings.route_optimization_max_bruteforce_points:
        return find_order_bruteforce(matrix, start_index, finish_index)
    if algorithm == "held_karp" and n <= settings.route_optimization_max_held_karp_points:
        return find_order_held_karp(matrix, start_index, finish_index)
    if algorithm == "nearest_neighbor":
        return find_order_nearest_neighbor(matrix, start_index, finish_index)
    return find_order_nearest_neighbor_2opt(matrix, start_index, finish_index)


def find_order_bruteforce(matrix: list[list[float | None]], start_index: int, finish_index: int) -> OptimizationResult:
    started = time.perf_counter()
    middle = [i for i in range(len(matrix)) if i not in {start_index, finish_index}]
    best_order: list[int] | None = None
    best_cost: float | None = None
    checked = 0
    for perm in permutations(middle):
        order = [start_index, *perm, finish_index]
        cost = route_cost(order, matrix)
        checked += 1
        if cost is not None and (best_cost is None or cost < best_cost):
            best_cost = cost
            best_order = order
    if best_order is None or best_cost is None:
        raise ValueError("Route cannot be built")
    return OptimizationResult(best_order, best_cost, "bruteforce", time.perf_counter() - started, checked)


def find_order_held_karp(matrix: list[list[float | None]], start_index: int, finish_index: int) -> OptimizationResult:
    started = time.perf_counter()
    middle = [i for i in range(len(matrix)) if i not in {start_index, finish_index}]
    pos_by_point = {point_index: pos for pos, point_index in enumerate(middle)}
    dp: dict[tuple[int, int], tuple[float, int]] = {}
    for point_index in middle:
        value = matrix[start_index][point_index]
        if value is not None:
            dp[(1 << pos_by_point[point_index], point_index)] = (value, start_index)
    full_mask = (1 << len(middle)) - 1
    checked = 0
    for mask in range(1, full_mask + 1):
        for last in middle:
            state = (mask, last)
            if state not in dp:
                continue
            current_cost, _ = dp[state]
            for next_point in middle:
                bit = 1 << pos_by_point[next_point]
                if mask & bit:
                    continue
                checked += 1
                transition = matrix[last][next_point]
                if transition is None:
                    continue
                next_state = (mask | bit, next_point)
                new_cost = current_cost + transition
                if next_state not in dp or new_cost < dp[next_state][0]:
                    dp[next_state] = (new_cost, last)
    best_cost: float | None = None
    best_last: int | None = None
    for last in middle:
        state = (full_mask, last)
        if state not in dp:
            continue
        transition = matrix[last][finish_index]
        checked += 1
        if transition is None:
            continue
        total = dp[state][0] + transition
        if best_cost is None or total < best_cost:
            best_cost = total
            best_last = last
    if not middle:
        direct = matrix[start_index][finish_index]
        if direct is None:
            raise ValueError("Route cannot be built")
        return OptimizationResult([start_index, finish_index], direct, "held_karp", time.perf_counter() - started, 1)
    if best_cost is None or best_last is None:
        raise ValueError("Route cannot be built")
    order_reversed: list[int] = []
    mask = full_mask
    last = best_last
    while last != start_index:
        order_reversed.append(last)
        _, previous = dp[(mask, last)]
        if last in pos_by_point:
            mask ^= 1 << pos_by_point[last]
        last = previous
    return OptimizationResult([start_index, *reversed(order_reversed), finish_index], best_cost, "held_karp", time.perf_counter() - started, checked)


def find_order_nearest_neighbor(matrix: list[list[float | None]], start_index: int, finish_index: int) -> OptimizationResult:
    started = time.perf_counter()
    unvisited = {i for i in range(len(matrix)) if i not in {start_index, finish_index}}
    order = [start_index]
    current = start_index
    checked = 0
    while unvisited:
        candidates = []
        for point_index in unvisited:
            checked += 1
            value = matrix[current][point_index]
            if value is not None:
                candidates.append((value, point_index))
        if not candidates:
            raise ValueError("Route cannot be built")
        _, current = min(candidates, key=lambda item: item[0])
        order.append(current)
        unvisited.remove(current)
    order.append(finish_index)
    cost = route_cost(order, matrix)
    if cost is None:
        raise ValueError("Route cannot be built")
    return OptimizationResult(order, cost, "nearest_neighbor", time.perf_counter() - started, checked)


def find_order_nearest_neighbor_2opt(matrix: list[list[float | None]], start_index: int, finish_index: int) -> OptimizationResult:
    started = time.perf_counter()
    initial = find_order_nearest_neighbor(matrix, start_index, finish_index)
    best_order = initial.order[:]
    best_cost = initial.cost
    checked = initial.checked_variants or 0
    improved = True
    while improved:
        improved = False
        for i in range(1, len(best_order) - 2):
            for j in range(i + 1, len(best_order) - 1):
                checked += 1
                candidate = best_order[:i] + list(reversed(best_order[i : j + 1])) + best_order[j + 1 :]
                cost = route_cost(candidate, matrix)
                if cost is not None and cost < best_cost:
                    best_order = candidate
                    best_cost = cost
                    improved = True
    return OptimizationResult(best_order, best_cost, "nearest_neighbor_2opt", time.perf_counter() - started, checked)


def route_cost(order: list[int], matrix: list[list[float | None]]) -> float | None:
    total = 0.0
    for src, dst in zip(order, order[1:]):
        value = matrix[src][dst]
        if value is None:
            return None
        total += value
    return total


def _coordinates_from_snapped(points: list[dict[str, Any]]) -> str:
    return ";".join(f"{point['longitude']},{point['latitude']}" for point in points)


def _point_as_snapped(point: PointOfInterest, source: str | None) -> dict[str, Any]:
    return {
        "point_id": point.id,
        "longitude": float(point.longitude),
        "latitude": float(point.latitude),
        "snap_distance_m": None,
        "snap_source": source,
    }


def _fallback_table(points: list[PointOfInterest]) -> dict[str, Any]:
    distances: list[list[float]] = []
    durations: list[list[float]] = []
    for src in points:
        distance_row = []
        duration_row = []
        for dst in points:
            distance = _haversine_m(src, dst)
            distance_row.append(distance)
            duration_row.append(distance / 1.25)
        distances.append(distance_row)
        durations.append(duration_row)
    return {"code": "Ok", "distances": distances, "durations": durations}


def _straight_line_route_or_error(points: list[PointOfInterest], strict: bool) -> dict[str, Any]:
    if not settings.allow_straight_line_route_fallback:
        raise ValueError(ROAD_ROUTE_ERROR)
    distance = sum(_haversine_m(src, dst) for src, dst in zip(points, points[1:]))
    return {
        "geometry": {"type": "LineString", "coordinates": [[float(p.longitude), float(p.latitude)] for p in points]},
        "distance": distance,
        "duration": distance / 1.25,
        "snapped_points": [_point_as_snapped(point, "straight_line_dev_fallback") for point in points],
    }


def _route_metadata(plan: RoutePlanResult, manual_geometry_edited: bool) -> dict[str, Any]:
    return {
        "geometry_format": "geojson",
        "geometry_source": "road",
        "manual_geometry_edited": manual_geometry_edited,
        "distance_meters": plan.distance,
        "duration_seconds": plan.duration,
        "snapped_points": plan.snapped_points,
        "last_built_at": int(time.time()),
    }


def _haversine_m(src: PointOfInterest, dst: PointOfInterest) -> float:
    radius = 6371000
    lat1, lon1, lat2, lon2 = map(radians, [float(src.latitude), float(src.longitude), float(dst.latitude), float(dst.longitude)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return radius * 2 * atan2(sqrt(a), sqrt(1 - a))


def _index_by_point_id(points: list[PointOfInterest], point_id: int | None) -> int:
    for index, point in enumerate(points):
        if point.id == point_id:
            return index
    raise ValueError("Start or finish point is not in point_ids")
