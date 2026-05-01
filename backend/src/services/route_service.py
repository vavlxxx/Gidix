from __future__ import annotations

import time
from dataclasses import dataclass
from itertools import permutations
from math import radians, sin, cos, sqrt, atan2
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.config import settings
from src.models.domain import PointOfInterest, Route, RoutePoint
from src.schemas.domain import RouteGenerateRequest
from src.utils.db_tools import DBManager


@dataclass(frozen=True)
class OptimizationResult:
    order: list[int]
    cost: float
    algorithm: str
    elapsed_seconds: float
    checked_variants: int | None = None


class RouteService:
    def __init__(self, db: DBManager) -> None:
        self.db = db

    async def generate_route(self, data: RouteGenerateRequest) -> Route:
        points = await self._load_points(data.point_ids)
        if len(points) < 2:
            raise ValueError("At least two points are required")

        start_index = _index_by_point_id(points, data.start_point_id) if data.start_point_id else 0
        finish_index = _index_by_point_id(points, data.finish_point_id) if data.finish_point_id else len(points) - 1
        algorithm = data.algorithm or settings.route_optimization_default

        table = await self._get_table(points)
        durations = table["durations"]
        distances = table["distances"]
        optimization = find_best_order(durations, start_index, finish_index, algorithm)
        ordered_points = [points[index] for index in optimization.order]
        route_data = await self._get_route(ordered_points)

        route = Route(
            title=data.title,
            description=None,
            start_point_id=ordered_points[0].id,
            finish_point_id=ordered_points[-1].id,
            estimated_duration_min=round(route_data["duration"] / 60),
            estimated_length_km=round(route_data["distance"] / 1000, 2),
            formation_type="osrm" if settings.enable_route_generation else "local",
            optimization_algorithm=optimization.algorithm,
            geometry_geojson=route_data["geometry"],
            route_metadata={
                "matrix_cost_seconds": optimization.cost,
                "elapsed_seconds": optimization.elapsed_seconds,
                "checked_variants": optimization.checked_variants,
                "distance_matrix": distances,
            },
        )
        self.db.session.add(route)
        await self.db.session.flush()
        for position, point in enumerate(ordered_points, 1):
            self.db.session.add(
                RoutePoint(
                    route_id=route.id,
                    point_id=point.id,
                    position=position,
                    visit_duration_min=point.visit_duration_min,
                )
            )
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

        coordinates = _coordinates(points)
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

    async def _get_route(self, points: list[PointOfInterest]) -> dict[str, Any]:
        if not settings.enable_route_generation:
            return _fallback_route(points)
        coordinates = _coordinates(points)
        params = {"overview": "full", "geometries": "geojson", "steps": "false", "annotations": "false"}
        url = f"{settings.osrm_base_url}/route/v1/{settings.osrm_profile}/{coordinates}?{urlencode(params)}"
        try:
            async with httpx.AsyncClient(timeout=settings.osrm_timeout_seconds) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    return {"geometry": route["geometry"], "distance": route["distance"], "duration": route["duration"]}
        except Exception:
            pass
        return _fallback_route(points)


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


def _coordinates(points: list[PointOfInterest]) -> str:
    return ";".join(f"{float(point.longitude)},{float(point.latitude)}" for point in points)


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


def _fallback_route(points: list[PointOfInterest]) -> dict[str, Any]:
    distance = sum(_haversine_m(src, dst) for src, dst in zip(points, points[1:]))
    return {
        "geometry": {"type": "LineString", "coordinates": [[float(p.longitude), float(p.latitude)] for p in points]},
        "distance": distance,
        "duration": distance / 1.25,
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
