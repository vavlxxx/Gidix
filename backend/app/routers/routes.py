from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import get_optional_user, require_roles
from app.db import get_db
from app.models import Photo, Point, Route
from app.schemas import RouteCreate, RouteListItem, RouteOut, RouteUpdate

router = APIRouter(prefix="/api/routes", tags=["routes"])


def _cover_photo(route: Route) -> str | None:
    for photo in route.photos:
        if photo.is_cover:
            return photo.file_path
    if route.photos:
        return route.photos[0].file_path
    return None


@router.get("/", response_model=list[RouteListItem])
def list_routes(
    include_unpublished: bool = False,
    search: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> list[RouteListItem]:
    query = db.query(Route)
    if include_unpublished:
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация")
    else:
        query = query.filter(Route.is_published.is_(True))
    if search:
        query = query.filter(Route.title.ilike(f"%{search}%"))
    routes = query.order_by(Route.created_at.desc()).all()
    return [
        RouteListItem(
            id=route.id,
            title=route.title,
            description=route.description,
            duration_hours=route.duration_hours,
            price_adult=route.price_adult,
            max_participants=route.max_participants,
            is_published=route.is_published,
            cover_photo=_cover_photo(route),
        )
        for route in routes
    ]


@router.get("/{route_id}", response_model=RouteOut)
def get_route(
    route_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> RouteOut:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route or (not route.is_published and not user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    return RouteOut.model_validate(route)


@router.post("/", response_model=RouteOut)
def create_route(
    payload: RouteCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> RouteOut:
    route = Route(
        title=payload.title,
        description=payload.description,
        duration_hours=payload.duration_hours,
        price_adult=payload.price_adult,
        price_child=payload.price_child,
        price_group=payload.price_group,
        max_participants=payload.max_participants,
        is_published=payload.is_published,
    )
    db.add(route)
    db.flush()

    points = [
        Point(
            route_id=route.id,
            title=point.title,
            description=point.description,
            lat=point.lat,
            lng=point.lng,
            point_type=point.point_type,
            visit_minutes=point.visit_minutes,
            order_index=point.order_index,
        )
        for point in payload.points
    ]
    photos = [
        Photo(
            route_id=route.id,
            file_path=photo.file_path,
            sort_order=photo.sort_order,
            is_cover=photo.is_cover,
        )
        for photo in payload.photos
    ]
    if photos and not any(photo.is_cover for photo in photos):
        photos[0].is_cover = True
    db.add_all(points + photos)
    log_action(db, user, "route_create", {"route_id": route.id})
    db.commit()
    db.refresh(route)
    return RouteOut.model_validate(route)


@router.put("/{route_id}", response_model=RouteOut)
def update_route(
    route_id: int,
    payload: RouteUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> RouteOut:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")

    route.title = payload.title
    route.description = payload.description
    route.duration_hours = payload.duration_hours
    route.price_adult = payload.price_adult
    route.price_child = payload.price_child
    route.price_group = payload.price_group
    route.max_participants = payload.max_participants
    route.is_published = payload.is_published

    route.points.clear()
    route.photos.clear()

    for point in payload.points:
        route.points.append(
            Point(
                title=point.title,
                description=point.description,
                lat=point.lat,
                lng=point.lng,
                point_type=point.point_type,
                visit_minutes=point.visit_minutes,
                order_index=point.order_index,
            )
        )
    for photo in payload.photos:
        route.photos.append(
            Photo(
                file_path=photo.file_path,
                sort_order=photo.sort_order,
                is_cover=photo.is_cover,
            )
        )
    if route.photos and not any(photo.is_cover for photo in route.photos):
        route.photos[0].is_cover = True

    log_action(db, user, "route_update", {"route_id": route.id})
    db.commit()
    db.refresh(route)
    return RouteOut.model_validate(route)


@router.delete("/{route_id}")
def archive_route(
    route_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> dict:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    route.is_published = False
    log_action(db, user, "route_archive", {"route_id": route.id})
    db.commit()
    return {"status": "ok"}
