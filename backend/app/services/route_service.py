from __future__ import annotations

import math
import time
from dataclasses import dataclass
from itertools import permutations
from urllib.parse import urlencode

import requests

from app.core.config import settings


@dataclass(frozen=True)
class RoutePointInput:
    name: str
    lon: float
    lat: float
    facts: str | None = None


@dataclass(frozen=True)
class OptimizationResult:
    order: list[int]
    cost: float
    algorithm: str
    elapsed_seconds: float
    checked_variants: int | None = None


class RouteServiceError(RuntimeError):
    pass


def build_coordinates(points: list[RoutePointInput]) -> str:
    return ";".join(f"{point.lon},{point.lat}" for point in points)


def haversine_km(a: RoutePointInput, b: RoutePointInput) -> float:
    radius_km = 6371.0
    lat1 = math.radians(a.lat)
    lat2 = math.radians(b.lat)
    d_lat = math.radians(b.lat - a.lat)
    d_lon = math.radians(b.lon - a.lon)
    value = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(value))


def haversine_seconds(a: RoutePointInput, b: RoutePointInput) -> float:
    # Conservative walking fallback: 4.5 km/h.
    return (haversine_km(a, b) / 4.5) * 3600


def haversine_matrix(points: list[RoutePointInput]) -> list[list[float]]:
    return [
        [0.0 if i == j else haversine_seconds(a, b) for j, b in enumerate(points)]
        for i, a in enumerate(points)
    ]


def route_cost(order: list[int], matrix: list[list[float | None]]) -> float | None:
    total = 0.0
    for i, j in zip(order, order[1:]):
        value = matrix[i][j]
        if value is None:
            return None
        total += value
    return total


def find_order_bruteforce(matrix: list[list[float | None]], start_index: int, finish_index: int) -> OptimizationResult:
    started_at = time.perf_counter()
    n = len(matrix)
    middle = [i for i in range(n) if i not in {start_index, finish_index}]
    best_order: list[int] | None = None
    best_cost: float | None = None
    checked_variants = 0

    for perm in permutations(middle):
        order = [start_index, *perm, finish_index]
        cost = route_cost(order, matrix)
        checked_variants += 1
        if cost is None:
            continue
        if best_cost is None or cost < best_cost:
            best_cost = cost
            best_order = order

    if best_order is None or best_cost is None:
        raise RouteServiceError("Не удалось найти допустимый порядок точек.")

    return OptimizationResult(
        order=best_order,
        cost=best_cost,
        algorithm="bruteforce",
        elapsed_seconds=time.perf_counter() - started_at,
        checked_variants=checked_variants,
    )


def find_order_held_karp(matrix: list[list[float | None]], start_index: int, finish_index: int) -> OptimizationResult:
    started_at = time.perf_counter()
    n = len(matrix)
    middle = [i for i in range(n) if i not in {start_index, finish_index}]

    if not middle:
        value = matrix[start_index][finish_index]
        if value is None:
            raise RouteServiceError("Переход от старта до финиша недоступен.")
        return OptimizationResult(
            order=[start_index, finish_index],
            cost=value,
            algorithm="held_karp",
            elapsed_seconds=time.perf_counter() - started_at,
            checked_variants=1,
        )

    pos_by_point = {point_index: pos for pos, point_index in enumerate(middle)}
    dp: dict[tuple[int, int], tuple[float, int]] = {}

    for point_index in middle:
        value = matrix[start_index][point_index]
        if value is None:
            continue
        dp[(1 << pos_by_point[point_index], point_index)] = (value, start_index)

    full_mask = (1 << len(middle)) - 1
    transitions_checked = 0

    for mask in range(1, full_mask + 1):
        for last in middle:
            state = (mask, last)
            if state not in dp:
                continue
            current_cost, _ = dp[state]
            for next_point in middle:
                next_bit = 1 << pos_by_point[next_point]
                if mask & next_bit:
                    continue
                transition = matrix[last][next_point]
                transitions_checked += 1
                if transition is None:
                    continue
                next_state = (mask | next_bit, next_point)
                new_cost = current_cost + transition
                if next_state not in dp or new_cost < dp[next_state][0]:
                    dp[next_state] = (new_cost, last)

    best_cost: float | None = None
    best_last: int | None = None
    for last in middle:
        state = (full_mask, last)
        if state not in dp:
            continue
        cost_to_last, _ = dp[state]
        transition_to_finish = matrix[last][finish_index]
        transitions_checked += 1
        if transition_to_finish is None:
            continue
        total_cost = cost_to_last + transition_to_finish
        if best_cost is None or total_cost < best_cost:
            best_cost = total_cost
            best_last = last

    if best_cost is None or best_last is None:
        raise RouteServiceError("Не найден допустимый маршрут до финиша.")

    reversed_order: list[int] = []
    mask = full_mask
    last = best_last
    while last != start_index:
        reversed_order.append(last)
        _, previous = dp[(mask, last)]
        if last in pos_by_point:
            mask ^= 1 << pos_by_point[last]
        last = previous
        if last == start_index:
            break

    return OptimizationResult(
        order=[start_index, *reversed(reversed_order), finish_index],
        cost=best_cost,
        algorithm="held_karp",
        elapsed_seconds=time.perf_counter() - started_at,
        checked_variants=transitions_checked,
    )


def find_order_nearest_neighbor(matrix: list[list[float | None]], start_index: int, finish_index: int) -> OptimizationResult:
    started_at = time.perf_counter()
    n = len(matrix)
    unvisited = {i for i in range(n) if i not in {start_index, finish_index}}
    order = [start_index]
    current = start_index
    checked_variants = 0

    while unvisited:
        candidates: list[tuple[float, int]] = []
        for point_index in unvisited:
            value = matrix[current][point_index]
            checked_variants += 1
            if value is not None:
                candidates.append((value, point_index))
        if not candidates:
            raise RouteServiceError("Нет доступного перехода к оставшимся точкам.")
        _, next_point = min(candidates, key=lambda item: item[0])
        order.append(next_point)
        unvisited.remove(next_point)
        current = next_point

    if matrix[current][finish_index] is None:
        raise RouteServiceError("Нет доступного перехода от последней точки к финишу.")
    order.append(finish_index)
    cost = route_cost(order, matrix)
    if cost is None:
        raise RouteServiceError("Не удалось посчитать стоимость маршрута.")

    return OptimizationResult(
        order=order,
        cost=cost,
        algorithm="nearest_neighbor",
        elapsed_seconds=time.perf_counter() - started_at,
        checked_variants=checked_variants,
    )


def improve_order_2opt(initial_order: list[int], matrix: list[list[float | None]]) -> tuple[list[int], float, int]:
    best_order = initial_order[:]
    best_cost = route_cost(best_order, matrix)
    if best_cost is None:
        raise RouteServiceError("Начальный маршрут для 2-opt недопустим.")

    checked_swaps = 0
    improved = True
    while improved:
        improved = False
        for i in range(1, len(best_order) - 2):
            for j in range(i + 1, len(best_order) - 1):
                checked_swaps += 1
                candidate = best_order[:i] + list(reversed(best_order[i : j + 1])) + best_order[j + 1 :]
                candidate_cost = route_cost(candidate, matrix)
                if candidate_cost is not None and candidate_cost < best_cost:
                    best_order = candidate
                    best_cost = candidate_cost
                    improved = True
    return best_order, best_cost, checked_swaps


def find_order_nearest_neighbor_2opt(
    matrix: list[list[float | None]],
    start_index: int,
    finish_index: int,
) -> OptimizationResult:
    started_at = time.perf_counter()
    initial = find_order_nearest_neighbor(matrix, start_index, finish_index)
    order, cost, checked_swaps = improve_order_2opt(initial.order, matrix)
    return OptimizationResult(
        order=order,
        cost=cost,
        algorithm="nearest_neighbor_2opt",
        elapsed_seconds=time.perf_counter() - started_at,
        checked_variants=(initial.checked_variants or 0) + checked_swaps,
    )


class RouteService:
    def __init__(self) -> None:
        self.base_url = settings.osrm_base_url.rstrip("/")
        self.profile = settings.osrm_profile
        self.timeout = settings.osrm_timeout_seconds

    def get_table(self, points: list[RoutePointInput]) -> dict:
        coordinates = build_coordinates(points)
        params = urlencode({"annotations": "duration,distance"})
        url = f"{self.base_url}/table/v1/{self.profile}/{coordinates}?{params}"
        try:
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise RouteServiceError(f"OSRM Table API недоступен: {exc}") from exc
        if data.get("code") != "Ok" or "durations" not in data:
            raise RouteServiceError(f"OSRM Table API вернул некорректный ответ: {data}")
        return data

    def get_route(self, points: list[RoutePointInput]) -> dict:
        coordinates = build_coordinates(points)
        params = urlencode(
            {
                "overview": "full",
                "geometries": "geojson",
                "steps": "true",
                "annotations": "true",
            }
        )
        url = f"{self.base_url}/route/v1/{self.profile}/{coordinates}?{params}"
        try:
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise RouteServiceError(f"OSRM Route API недоступен: {exc}") from exc
        if data.get("code") != "Ok" or not data.get("routes"):
            raise RouteServiceError(f"OSRM Route API вернул некорректный ответ: {data}")
        return data

    def get_nearest(self, point: RoutePointInput) -> dict:
        url = f"{self.base_url}/nearest/v1/{self.profile}/{point.lon},{point.lat}?number=1"
        try:
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise RouteServiceError(f"OSRM Nearest API недоступен: {exc}") from exc
        if data.get("code") != "Ok":
            raise RouteServiceError(f"OSRM Nearest API вернул некорректный ответ: {data}")
        return data

    def optimize_order(
        self,
        matrix: list[list[float | None]],
        algorithm: str,
        start_index: int,
        finish_index: int,
    ) -> OptimizationResult:
        n = len(matrix)
        if algorithm == "bruteforce" and n > settings.route_optimization_max_bruteforce_points:
            raise RouteServiceError(
                f"bruteforce доступен до {settings.route_optimization_max_bruteforce_points} точек. "
                "Выберите nearest_neighbor_2opt."
            )
        if algorithm == "held_karp" and n > settings.route_optimization_max_held_karp_points:
            raise RouteServiceError(
                f"held_karp доступен до {settings.route_optimization_max_held_karp_points} точек. "
                "Выберите nearest_neighbor_2opt."
            )
        if algorithm == "bruteforce":
            return find_order_bruteforce(matrix, start_index, finish_index)
        if algorithm == "held_karp":
            return find_order_held_karp(matrix, start_index, finish_index)
        if algorithm == "nearest_neighbor":
            return find_order_nearest_neighbor(matrix, start_index, finish_index)
        if algorithm == "nearest_neighbor_2opt":
            return find_order_nearest_neighbor_2opt(matrix, start_index, finish_index)
        raise RouteServiceError(f"Неизвестный алгоритм оптимизации: {algorithm}")

    def plan_route(
        self,
        points: list[RoutePointInput],
        algorithm: str | None = None,
        start_index: int = 0,
        finish_index: int | None = None,
    ) -> dict:
        if len(points) < 2:
            raise RouteServiceError("Для построения маршрута нужно минимум две точки.")
        finish = finish_index if finish_index is not None else len(points) - 1
        selected_algorithm = algorithm or settings.route_optimization_default
        fallback = False
        message: str | None = None

        try:
            table = self.get_table(points)
            durations = table["durations"]
        except RouteServiceError as exc:
            durations = haversine_matrix(points)
            fallback = True
            message = f"{exc}. Использован прямой расчет по координатам, порядок можно править вручную."

        optimization = self.optimize_order(durations, selected_algorithm, start_index, finish)
        ordered_points = [points[index] for index in optimization.order]

        try:
            route_data = self.get_route(ordered_points)
            route = route_data["routes"][0]
            geometry = route.get("geometry")
            distance_km = float(route.get("distance", 0)) / 1000
            duration_min = float(route.get("duration", 0)) / 60
            legs = []
            for leg_index, leg in enumerate(route.get("legs", [])):
                legs.append(
                    {
                        "from_name": ordered_points[leg_index].name,
                        "to_name": ordered_points[leg_index + 1].name,
                        "distance_km": round(float(leg.get("distance", 0)) / 1000, 3),
                        "duration_min": round(float(leg.get("duration", 0)) / 60, 1),
                    }
                )
        except RouteServiceError as exc:
            fallback = True
            message = message or f"{exc}. Геометрия построена прямыми линиями."
            geometry = {
                "type": "LineString",
                "coordinates": [[point.lon, point.lat] for point in ordered_points],
            }
            distance_km = sum(haversine_km(a, b) for a, b in zip(ordered_points, ordered_points[1:]))
            duration_min = sum(haversine_seconds(a, b) for a, b in zip(ordered_points, ordered_points[1:])) / 60
            legs = [
                {
                    "from_name": a.name,
                    "to_name": b.name,
                    "distance_km": round(haversine_km(a, b), 3),
                    "duration_min": round(haversine_seconds(a, b) / 60, 1),
                }
                for a, b in zip(ordered_points, ordered_points[1:])
            ]

        return {
            "algorithm": optimization.algorithm,
            "order": optimization.order,
            "ordered_points": ordered_points,
            "distance_km": round(distance_km, 3),
            "duration_min": round(duration_min, 1),
            "geometry_geojson": geometry,
            "legs": legs,
            "fallback": fallback,
            "message": message,
        }
