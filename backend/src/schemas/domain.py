from __future__ import annotations

from datetime import date, time
from decimal import Decimal
from typing import Any

from pydantic import EmailStr, Field, field_validator, model_validator

from src.schemas.base import BaseDTO


class Pagination(BaseDTO):
    offset: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=500)


class PointCategoryCreate(BaseDTO):
    name: str = Field(..., max_length=150)
    description: str | None = None


class PointCategoryRead(PointCategoryCreate):
    id: int


class PointCreate(BaseDTO):
    name: str = Field(..., max_length=255)
    category_id: int | None = None
    short_description: str | None = Field(None, max_length=500)
    full_description: str | None = None
    address: str | None = Field(None, max_length=500)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    visit_duration_min: int = Field(15, ge=1, le=480)
    image_url: str | None = None
    source: str | None = None
    external_id: str | None = None
    extra: dict[str, Any] | None = None
    active: bool = True


class PointUpdate(BaseDTO):
    name: str | None = None
    category_id: int | None = None
    short_description: str | None = None
    full_description: str | None = None
    address: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    visit_duration_min: int | None = Field(None, ge=1, le=480)
    image_url: str | None = None
    extra: dict[str, Any] | None = None
    active: bool | None = None


class PointRead(PointCreate):
    id: int


class RoutePointIn(BaseDTO):
    point_id: int
    position: int = Field(..., ge=1)
    visit_duration_min: int | None = Field(None, ge=1, le=480)
    note: str | None = None


class RouteCreate(BaseDTO):
    title: str
    description: str | None = None
    start_point_id: int | None = None
    finish_point_id: int | None = None
    estimated_duration_min: int | None = None
    estimated_length_km: Decimal | None = None
    formation_type: str = "manual"
    optimization_algorithm: str | None = None
    geometry_geojson: dict[str, Any] | None = None
    route_metadata: dict[str, Any] | None = None
    points: list[RoutePointIn] = []
    active: bool = True

    @field_validator("geometry_geojson")
    @classmethod
    def validate_geometry_geojson(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return validate_route_geometry_geojson(value)

    @model_validator(mode="after")
    def validate_route_has_points(self) -> "RouteCreate":
        if not self.points:
            raise ValueError("Route must include at least one point")
        return self


class RouteUpdate(BaseDTO):
    title: str | None = None
    description: str | None = None
    start_point_id: int | None = None
    finish_point_id: int | None = None
    estimated_duration_min: int | None = None
    estimated_length_km: Decimal | None = None
    formation_type: str | None = None
    optimization_algorithm: str | None = None
    geometry_geojson: dict[str, Any] | None = None
    route_metadata: dict[str, Any] | None = None
    points: list[RoutePointIn] | None = None
    active: bool | None = None

    @field_validator("geometry_geojson")
    @classmethod
    def validate_geometry_geojson(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return validate_route_geometry_geojson(value)

    @model_validator(mode="after")
    def validate_route_has_points_when_updated(self) -> "RouteUpdate":
        if self.points is not None and not self.points:
            raise ValueError("Route must include at least one point")
        return self


class RoutePointRead(RoutePointIn):
    id: int
    point: PointRead | None = None


class RouteRead(BaseDTO):
    id: int
    title: str
    description: str | None = None
    start_point_id: int | None = None
    finish_point_id: int | None = None
    estimated_duration_min: int | None = None
    estimated_length_km: Decimal | None = None
    formation_type: str
    optimization_algorithm: str | None = None
    geometry_geojson: dict[str, Any] | None = None
    route_metadata: dict[str, Any] | None = None
    active: bool
    points: list[RoutePointRead] = []

    @field_validator("geometry_geojson")
    @classmethod
    def validate_geometry_geojson(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return validate_route_geometry_geojson(value)


class RouteGenerateRequest(BaseDTO):
    title: str = "Автоматический маршрут"
    point_ids: list[int] = Field(..., min_length=2)
    start_point_id: int | None = None
    finish_point_id: int | None = None
    algorithm: str | None = None


class RoutePreviewRoadRequest(BaseDTO):
    point_ids: list[int] = Field(..., min_length=2)
    preserve_order: bool = True
    start_point_id: int | None = None
    finish_point_id: int | None = None


class RouteBuildPlanRequest(BaseDTO):
    title: str = "Новый маршрут"
    description: str | None = None
    point_ids: list[int] = Field(..., min_length=2)
    start_point_id: int | None = None
    finish_point_id: int | None = None


class RouteGeometryUpdate(BaseDTO):
    geometry_geojson: dict[str, Any]
    is_geometry_customized: bool = True

    @field_validator("geometry_geojson")
    @classmethod
    def validate_geometry_geojson(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_route_geometry_geojson(value)


class RoutePreviewRead(BaseDTO):
    geometry_geojson: dict[str, Any] | None = None
    estimated_duration_min: int | None = None
    estimated_length_km: Decimal | None = None
    points: list[RoutePointIn] = []
    snapped_points: list[dict[str, Any]] = []

    @field_validator("geometry_geojson")
    @classmethod
    def validate_geometry_geojson(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return validate_route_geometry_geojson(value)


def validate_route_geometry_geojson(value: dict[str, Any] | None) -> dict[str, Any] | None:
    if value is None:
        return value
    if not isinstance(value, dict):
        raise ValueError("geometry_geojson должен быть GeoJSON LineString.")
    if value.get("type") != "LineString":
        raise ValueError("geometry_geojson должен иметь type='LineString'.")
    coordinates = value.get("coordinates")
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        raise ValueError("geometry_geojson.coordinates должен содержать минимум две координаты.")
    normalized: list[list[float]] = []
    for index, coordinate in enumerate(coordinates, start=1):
        if not isinstance(coordinate, (list, tuple)) or len(coordinate) != 2:
            raise ValueError(f"Координата #{index} должна быть массивом [lon, lat].")
        lon, lat = coordinate
        if not isinstance(lon, (int, float)) or not isinstance(lat, (int, float)):
            raise ValueError(f"Координата #{index} должна содержать числовые lon и lat.")
        lon_value = float(lon)
        lat_value = float(lat)
        if not (-180 <= lon_value <= 180):
            raise ValueError(f"Координата #{index}: longitude должен быть от -180 до 180.")
        if not (-90 <= lat_value <= 90):
            raise ValueError(f"Координата #{index}: latitude должен быть от -90 до 90.")
        normalized.append([lon_value, lat_value])
    return {"type": "LineString", "coordinates": normalized}


class ExcursionCreate(BaseDTO):
    title: str
    description: str | None = None
    route_id: int | None = None
    base_price: Decimal = Decimal("0.00")
    duration_min: int | None = None
    image_url: str | None = None
    media_urls: list[str] | None = None
    meeting_point: str | None = None
    max_participants: int = Field(20, ge=1, le=200)
    active: bool = True


class ExcursionUpdate(BaseDTO):
    title: str | None = None
    description: str | None = None
    route_id: int | None = None
    base_price: Decimal | None = None
    duration_min: int | None = None
    image_url: str | None = None
    media_urls: list[str] | None = None
    meeting_point: str | None = None
    max_participants: int | None = Field(None, ge=1, le=200)
    active: bool | None = None


class GuideSessionCreate(BaseDTO):
    excursion_id: int
    guide_id: int | None = None
    session_date: date
    start_time: time
    capacity: int = Field(20, ge=1, le=200)
    status: str = "scheduled"


class GuideSessionRead(GuideSessionCreate):
    id: int
    available_places: int | None = None


class GuideSessionUpdate(BaseDTO):
    excursion_id: int | None = None
    guide_id: int | None = None
    session_date: date | None = None
    start_time: time | None = None
    capacity: int | None = Field(None, ge=1, le=200)
    status: str | None = None


class ExcursionRead(ExcursionCreate):
    id: int
    route: RouteRead | None = None
    sessions: list[GuideSessionRead] = []


class BookingCreate(BaseDTO):
    excursion_id: int | None = None
    session_id: int | None = None
    customer_name: str
    customer_phone: str | None = None
    customer_email: EmailStr | None = None
    participants_count: int = Field(1, ge=1, le=100)
    comment: str | None = None

    @model_validator(mode="before")
    @classmethod
    def empty_strings_to_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for key in ("customer_phone", "customer_email", "comment"):
                if data.get(key) == "":
                    data[key] = None
        return data


class BookingStatusUpdate(BaseDTO):
    status: str | None = None
    payment_status: str | None = None


class BookingRead(BaseDTO):
    id: int
    client_id: int | None = None
    excursion_id: int | None = None
    session_id: int | None = None
    excursion_title: str | None = None
    session_date: date | None = None
    start_time: time | None = None
    customer_name: str
    customer_phone: str | None = None
    customer_email: EmailStr | None = None
    participants_count: int
    total_price: Decimal
    status: str
    payment_status: str
    comment: str | None = None
    message: str | None = None


class ReviewCreate(BaseDTO):
    excursion_id: int
    rating: int = Field(..., ge=1, le=5)
    text: str | None = None


class ReviewRead(ReviewCreate):
    id: int
    user_id: int | None = None
    published: bool


class GeneratedDescriptionRead(BaseDTO):
    text: str
    sources: list[dict[str, Any]]


class ImportOSMRequest(BaseDTO):
    query: str = "tourism"
    bbox: str | None = None
    limit: int = Field(20, ge=1, le=100)

    @field_validator("bbox")
    @classmethod
    def validate_bbox(cls, value: str | None) -> str | None:
        if value is None:
            return value
        parts = value.split(",")
        if len(parts) != 4:
            raise ValueError("bbox must be 'south,west,north,east'")
        [float(part) for part in parts]
        return value


class IntegrationHealth(BaseDTO):
    name: str
    enabled: bool
    ok: bool
    detail: str | None = None
