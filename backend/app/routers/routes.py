from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import get_optional_user, require_roles
from app.db import get_db
from app.models import Booking, BookingStatus, CompletedExcursion, Photo, Point, Review, Route, RouteDate
from app.schemas import (
    CompletedExcursionCreate,
    CompletedExcursionOut,
    ReviewCreate,
    ReviewOut,
    RouteCreate,
    RouteDateCreate,
    RouteDateOut,
    RouteDateUpdate,
    RouteListItem,
    RouteOut,
    RouteUpdate,
)

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
            geom=func.ST_SetSRID(func.ST_MakePoint(point.lng, point.lat), 4326),
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
                geom=func.ST_SetSRID(func.ST_MakePoint(point.lng, point.lat), 4326),
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


@router.get("/{route_id}/dates", response_model=list[RouteDateOut])
def list_route_dates(
    route_id: int,
    include_booked: bool = False,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> list[RouteDateOut]:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route or (not route.is_published and not user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    query = db.query(RouteDate).filter(RouteDate.route_id == route_id)
    is_manager = bool(user and user.role.value in {"manager", "admin"})
    if is_manager:
        if not include_inactive:
            query = query.filter(RouteDate.is_active.is_(True))
        if not include_booked:
            query = query.filter(RouteDate.is_booked.is_(False))
    else:
        query = query.filter(
            RouteDate.is_active.is_(True),
            RouteDate.is_booked.is_(False),
            RouteDate.date >= date.today(),
        )
    dates = query.order_by(RouteDate.date.asc()).all()
    return [RouteDateOut.model_validate(item) for item in dates]


@router.post("/{route_id}/dates", response_model=RouteDateOut)
def create_route_date(
    route_id: int,
    payload: RouteDateCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> RouteDateOut:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    exists = db.query(RouteDate).filter(RouteDate.route_id == route_id, RouteDate.date == payload.date).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Дата уже добавлена")
    route_date = RouteDate(route_id=route_id, date=payload.date, is_active=True, is_booked=False)
    db.add(route_date)
    log_action(db, user, "route_date_create", {"route_id": route_id, "date": payload.date.isoformat()})
    db.commit()
    db.refresh(route_date)
    return RouteDateOut.model_validate(route_date)


@router.patch("/{route_id}/dates/{date_id}", response_model=RouteDateOut)
def update_route_date(
    route_id: int,
    date_id: int,
    payload: RouteDateUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> RouteDateOut:
    route_date = (
        db.query(RouteDate)
        .filter(RouteDate.id == date_id, RouteDate.route_id == route_id)
        .first()
    )
    if not route_date:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Дата не найдена")
    if payload.is_active is not None:
        route_date.is_active = payload.is_active
    log_action(
        db,
        user,
        "route_date_update",
        {"route_id": route_id, "date_id": route_date.id, "is_active": payload.is_active},
    )
    db.commit()
    db.refresh(route_date)
    return RouteDateOut.model_validate(route_date)


@router.delete("/{route_id}/dates/{date_id}")
def delete_route_date(
    route_id: int,
    date_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> dict:
    route_date = (
        db.query(RouteDate)
        .filter(RouteDate.id == date_id, RouteDate.route_id == route_id)
        .first()
    )
    if not route_date:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Дата не найдена")
    if route_date.is_booked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить забронированную дату")
    db.delete(route_date)
    log_action(db, user, "route_date_delete", {"route_id": route_id, "date_id": date_id})
    db.commit()
    return {"status": "ok"}


@router.get("/{route_id}/completed-excursions", response_model=list[CompletedExcursionOut])
def list_completed_excursions(
    route_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> list[CompletedExcursionOut]:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route or (not route.is_published and not user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    query = db.query(CompletedExcursion).filter(CompletedExcursion.route_id == route_id)
    if not user:
        query = query.filter(CompletedExcursion.starts_at <= datetime.now())
    excursions = query.order_by(CompletedExcursion.starts_at.desc()).all()
    return [CompletedExcursionOut.model_validate(item) for item in excursions]


@router.post("/{route_id}/completed-excursions", response_model=CompletedExcursionOut)
def create_completed_excursion(
    route_id: int,
    payload: CompletedExcursionCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> CompletedExcursionOut:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    if payload.starts_at > datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Проведенная экскурсия не может быть в будущем",
        )
    exists = (
        db.query(CompletedExcursion)
        .filter(
            CompletedExcursion.route_id == route_id,
            CompletedExcursion.starts_at == payload.starts_at,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Экскурсия уже добавлена")
    excursion = CompletedExcursion(route_id=route_id, starts_at=payload.starts_at)
    db.add(excursion)
    log_action(
        db,
        user,
        "completed_excursion_create",
        {"route_id": route_id, "starts_at": payload.starts_at.isoformat()},
    )
    db.commit()
    db.refresh(excursion)
    return CompletedExcursionOut.model_validate(excursion)


@router.get("/{route_id}/reviews", response_model=list[ReviewOut])
def list_reviews(
    route_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> list[ReviewOut]:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route or (not route.is_published and not user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    rows = (
        db.query(Review, CompletedExcursion.starts_at)
        .join(CompletedExcursion, Review.excursion_id == CompletedExcursion.id)
        .filter(CompletedExcursion.route_id == route_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return [
        ReviewOut(
            id=review.id,
            excursion_id=review.excursion_id,
            author_name=review.author_name,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            excursion_starts_at=starts_at,
        )
        for review, starts_at in rows
    ]


@router.post("/{route_id}/reviews", response_model=ReviewOut)
def create_review(
    route_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
) -> ReviewOut:
    route = db.query(Route).filter(Route.id == route_id, Route.is_published.is_(True)).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    excursion = (
        db.query(CompletedExcursion)
        .filter(
            CompletedExcursion.id == payload.excursion_id,
            CompletedExcursion.route_id == route_id,
        )
        .first()
    )
    if not excursion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Экскурсия не найдена")
    if excursion.starts_at > datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Экскурсия еще не проведена",
        )
    booking = (
        db.query(Booking)
        .filter(
            Booking.code == payload.booking_code,
            Booking.email == payload.email,
        )
        .first()
    )
    if not booking or booking.route_id != route_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Бронь не найдена")
    if booking.status != BookingStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отзыв доступен после завершения экскурсии",
        )
    if booking.desired_date != excursion.starts_at.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Бронь не относится к выбранной экскурсии",
        )
    exists = (
        db.query(Review)
        .filter(Review.excursion_id == excursion.id, Review.booking_id == booking.id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Отзыв уже оставлен")
    review = Review(
        excursion_id=excursion.id,
        booking_id=booking.id,
        author_name=booking.client_name,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    log_action(
        db,
        None,
        "review_create",
        {"route_id": route_id, "excursion_id": excursion.id, "booking_id": booking.id},
    )
    db.commit()
    db.refresh(review)
    return ReviewOut(
        id=review.id,
        excursion_id=review.excursion_id,
        author_name=review.author_name,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        excursion_starts_at=excursion.starts_at,
    )


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
