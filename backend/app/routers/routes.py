from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import get_optional_user, require_rules
from app.db import get_db
from app.models import Booking, BookingStatus, Photo, Point, Review, Route, RouteDate, Tariff, User, UserRole
from app.permissions import REVIEWS_MODERATE, ROUTE_MANAGE, user_has_rule
from app.schemas import (
    ReviewCreate,
    ReviewOut,
    ReviewUpdate,
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


def _starts_at_value(route_date: RouteDate) -> datetime:
    return route_date.starts_at or datetime.combine(route_date.date, time(0, 0))


def _ensure_minimum_notice(starts_at: datetime) -> None:
    if starts_at < datetime.now() + timedelta(hours=24):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Р”РѕР±Р°РІР»СЏС‚СЊ РґР°С‚Сѓ РјРѕР¶РЅРѕ РјРёРЅРёРјСѓРј Р·Р° СЃСѓС‚РєРё РґРѕ РЅР°С‡Р°Р»Р° СЌРєСЃРєСѓСЂСЃРёРё",
        )


def _ensure_no_overlap(
    route: Route,
    existing_dates: list[RouteDate],
    starts_at: datetime,
    exclude_id: int | None = None,
) -> None:
    duration = timedelta(hours=route.duration_hours)
    new_end = starts_at + duration
    for item in existing_dates:
        if exclude_id and item.id == exclude_id:
            continue
        existing_start = _starts_at_value(item)
        existing_end = existing_start + duration
        if starts_at < existing_end and new_end > existing_start:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Р­РєСЃРєСѓСЂСЃРёСЏ РїРµСЂРµСЃРµРєР°РµС‚СЃСЏ РїРѕ РІСЂРµРјРµРЅРё СЃ РґСЂСѓРіРѕР№ РґР°С‚РѕР№",
            )


def _get_guide(db: Session, guide_id: int) -> User:
    guide = (
        db.query(User)
        .filter(
            User.id == guide_id,
            User.role == UserRole.guide,
            User.is_active.is_(True),
        )
        .first()
    )
    if not guide:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Экскурсовод не найден или неактивен",
        )
    return guide


def _load_tariffs(db: Session, tariff_ids: list[int]) -> list[Tariff]:
    if not tariff_ids:
        return []
    unique_ids = list({int(item) for item in tariff_ids})
    tariffs = db.query(Tariff).filter(Tariff.id.in_(unique_ids)).all()
    if len(tariffs) != len(unique_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некоторые тарифы не найдены",
        )
    return tariffs


@router.get("/", response_model=list[RouteListItem])
def list_routes(
    include_unpublished: bool = False,
    search: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> list[RouteListItem]:
    review_stats = (
        db.query(
            RouteDate.route_id.label("route_id"),
            func.avg(Review.rating).label("rating_avg"),
            func.count(Review.id).label("rating_count"),
        )
        .join(RouteDate, Review.route_date_id == RouteDate.id)
        .filter(Review.is_approved.is_(True))
        .group_by(RouteDate.route_id)
        .subquery()
    )
    query = (
        db.query(Route, review_stats.c.rating_avg, review_stats.c.rating_count)
        .outerjoin(review_stats, review_stats.c.route_id == Route.id)
    )
    if include_unpublished:
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Требуется авторизация",
            )
        if not user_has_rule(db, user, ROUTE_MANAGE):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    else:
        query = query.filter(Route.is_published.is_(True))
    if search:
        query = query.filter(Route.title.ilike(f"%{search}%"))
    rows = query.order_by(Route.created_at.desc()).all()
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
            rating_avg=rating_avg,
            rating_count=rating_count or 0,
        )
        for route, rating_avg, rating_count in rows
    ]


@router.get("/{route_id}", response_model=RouteOut)
def get_route(
    route_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> RouteOut:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route or (not route.is_published and not user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ")
    rating_avg, rating_count = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .join(RouteDate, Review.route_date_id == RouteDate.id)
        .filter(RouteDate.route_id == route_id, Review.is_approved.is_(True))
        .first()
    )
    route_out = RouteOut.model_validate(route)
    return route_out.model_copy(update={"rating_avg": rating_avg, "rating_count": rating_count or 0})


@router.post("/", response_model=RouteOut)
def create_route(
    payload: RouteCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(ROUTE_MANAGE)),
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
    route.tariffs = _load_tariffs(db, payload.tariff_ids)

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
    user=Depends(require_rules(ROUTE_MANAGE)),
) -> RouteOut:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ")

    route.title = payload.title
    route.description = payload.description
    route.duration_hours = payload.duration_hours
    route.price_adult = payload.price_adult
    route.price_child = payload.price_child
    route.price_group = payload.price_group
    route.max_participants = payload.max_participants
    route.is_published = payload.is_published
    route.tariffs = _load_tariffs(db, payload.tariff_ids)

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
    include_past: bool = False,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> list[RouteDateOut]:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route or (not route.is_published and not user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ")
    query = db.query(RouteDate).filter(RouteDate.route_id == route_id)
    is_manager = bool(user and user_has_rule(db, user, ROUTE_MANAGE))
    if is_manager:
        if not include_inactive:
            query = query.filter(RouteDate.is_active.is_(True))
        if not include_booked:
            query = query.filter(RouteDate.is_booked.is_(False))
    else:
        query = query.filter(RouteDate.guide_id.isnot(None))
        if not include_inactive:
            query = query.filter(RouteDate.is_active.is_(True))
        if not include_booked:
            query = query.filter(RouteDate.is_booked.is_(False))
        if not include_past:
            min_start = datetime.now() + timedelta(hours=24)
            query = query.filter(RouteDate.starts_at >= min_start)
    dates = query.order_by(RouteDate.date.asc()).all()
    return [RouteDateOut.model_validate(item) for item in dates]


@router.post("/{route_id}/dates", response_model=RouteDateOut)
def create_route_date(
    route_id: int,
    payload: RouteDateCreate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(ROUTE_MANAGE)),
) -> RouteDateOut:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ")
    guide = _get_guide(db, payload.guide_id)
    starts_at = payload.starts_at
    date_value = payload.date
    if starts_at:
        date_value = starts_at.date()
    if not starts_at:
        starts_at = datetime.combine(date_value, time(0, 0))
    _ensure_minimum_notice(starts_at)
    exists = db.query(RouteDate).filter(RouteDate.route_id == route_id, RouteDate.date == date_value).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Р”Р°С‚Р° СѓР¶Рµ РґРѕР±Р°РІР»РµРЅР°")
    existing_dates = db.query(RouteDate).filter(RouteDate.route_id == route_id).all()
    _ensure_no_overlap(route, existing_dates, starts_at)
    route_date = RouteDate(
        route_id=route_id,
        guide_id=guide.id,
        date=date_value,
        starts_at=starts_at,
        is_active=True,
        is_booked=False,
    )
    db.add(route_date)
    log_action(
        db,
        user,
        "route_date_create",
        {
            "route_id": route_id,
            "guide_id": guide.id,
            "date": date_value.isoformat(),
            "starts_at": starts_at.isoformat(),
        },
    )
    db.commit()
    db.refresh(route_date)
    return RouteDateOut.model_validate(route_date)


@router.patch("/{route_id}/dates/{date_id}", response_model=RouteDateOut)
def update_route_date(
    route_id: int,
    date_id: int,
    payload: RouteDateUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(ROUTE_MANAGE)),
) -> RouteDateOut:
    route_date = (
        db.query(RouteDate)
        .filter(RouteDate.id == date_id, RouteDate.route_id == route_id)
        .first()
    )
    if not route_date:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Р”Р°С‚Р° РЅРµ РЅР°Р№РґРµРЅР°")
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ")
    next_guide_id = route_date.guide_id
    if payload.guide_id is not None:
        next_guide_id = _get_guide(db, payload.guide_id).id
    if next_guide_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Назначьте экскурсовода для этой экскурсии",
        )
    original_date = route_date.date
    next_date = route_date.date
    next_starts_at = route_date.starts_at
    if payload.starts_at:
        next_starts_at = payload.starts_at
        next_date = payload.starts_at.date()
    elif payload.date:
        next_date = payload.date
        if route_date.starts_at:
            next_starts_at = datetime.combine(payload.date, route_date.starts_at.time())
        else:
            next_starts_at = datetime.combine(payload.date, time(0, 0))
    if not next_starts_at:
        next_starts_at = datetime.combine(next_date, time(0, 0))
    schedule_changed = bool(payload.starts_at or payload.date)
    if schedule_changed:
        _ensure_minimum_notice(next_starts_at)
        existing_dates = db.query(RouteDate).filter(RouteDate.route_id == route_id).all()
        _ensure_no_overlap(route, existing_dates, next_starts_at, exclude_id=route_date.id)
    if next_date != original_date:
        exists = (
            db.query(RouteDate)
            .filter(RouteDate.route_id == route_id, RouteDate.date == next_date, RouteDate.id != route_date.id)
            .first()
        )
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Р”Р°С‚Р° СѓР¶Рµ Р·Р°РЅСЏС‚Р°")
        route_date.date = next_date
        route_date.starts_at = next_starts_at
        db.query(Booking).filter(
            Booking.route_id == route_id,
            Booking.desired_date == original_date,
            Booking.status != BookingStatus.canceled,
        ).update({Booking.desired_date: next_date}, synchronize_session=False)
    elif payload.starts_at:
        route_date.starts_at = next_starts_at
    if payload.is_active is not None:
        route_date.is_active = payload.is_active
    if route_date.guide_id != next_guide_id:
        route_date.guide_id = next_guide_id
    log_action(
        db,
        user,
        "route_date_update",
        {
            "route_id": route_id,
            "date_id": route_date.id,
            "is_active": payload.is_active,
            "guide_id": route_date.guide_id,
            "date": route_date.date.isoformat(),
            "starts_at": route_date.starts_at.isoformat() if route_date.starts_at else None,
        },
    )
    db.commit()
    db.refresh(route_date)
    return RouteDateOut.model_validate(route_date)


@router.delete("/{route_id}/dates/{date_id}")
def delete_route_date(
    route_id: int,
    date_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(ROUTE_MANAGE)),
) -> dict:
    route_date = (
        db.query(RouteDate)
        .filter(RouteDate.id == date_id, RouteDate.route_id == route_id)
        .first()
    )
    if not route_date:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Р”Р°С‚Р° РЅРµ РЅР°Р№РґРµРЅР°")
    if route_date.is_booked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ Р·Р°Р±СЂРѕРЅРёСЂРѕРІР°РЅРЅСѓСЋ РґР°С‚Сѓ")
    db.delete(route_date)
    log_action(db, user, "route_date_delete", {"route_id": route_id, "date_id": date_id})
    db.commit()
    return {"status": "ok"}


@router.get("/{route_id}/reviews", response_model=list[ReviewOut])
def list_reviews(
    route_id: int,
    include_pending: bool = False,
    db: Session = Depends(get_db),
    user=Depends(get_optional_user),
) -> list[ReviewOut]:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route or (not route.is_published and not user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ")
    query = (
        db.query(Review, RouteDate)
        .join(RouteDate, Review.route_date_id == RouteDate.id)
        .filter(RouteDate.route_id == route_id)
    )
    is_manager = bool(user and user_has_rule(db, user, REVIEWS_MODERATE))
    if include_pending:
        if not is_manager:
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Требуется авторизация",
                )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
    else:
        query = query.filter(Review.is_approved.is_(True))
    rows = query.order_by(Review.created_at.desc()).all()
    return [
        ReviewOut(
            id=review.id,
            route_date_id=review.route_date_id,
            author_name=review.author_name,
            rating=review.rating,
            comment=review.comment,
            is_approved=review.is_approved,
            created_at=review.created_at,
            excursion_starts_at=(route_date.starts_at or datetime.combine(route_date.date, time(0, 0))),
        )
        for review, route_date in rows
    ]


@router.post("/{route_id}/reviews", response_model=ReviewOut)
def create_review(
    route_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
) -> ReviewOut:
    route = db.query(Route).filter(Route.id == route_id, Route.is_published.is_(True)).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ")
    route_date = (
        db.query(RouteDate)
        .filter(
            RouteDate.id == payload.route_date_id,
            RouteDate.route_id == route_id,
        )
        .first()
    )
    if not route_date:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Р­РєСЃРєСѓСЂСЃРёСЏ РЅРµ РЅР°Р№РґРµРЅР°")
    starts_at = route_date.starts_at or datetime.combine(route_date.date, time(0, 0))
    booking = (
        db.query(Booking)
        .filter(
            Booking.code == payload.booking_code,
            Booking.email == payload.email,
        )
        .first()
    )
    if not booking or booking.route_id != route_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Р‘СЂРѕРЅСЊ РЅРµ РЅР°Р№РґРµРЅР°")
    if booking.desired_date != route_date.date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Р‘СЂРѕРЅСЊ РЅРµ РѕС‚РЅРѕСЃРёС‚СЃСЏ Рє РІС‹Р±СЂР°РЅРЅРѕР№ СЌРєСЃРєСѓСЂСЃРёРё",
        )
    exists = (
        db.query(Review)
        .filter(Review.route_date_id == route_date.id, Review.booking_id == booking.id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="РћС‚Р·С‹РІ СѓР¶Рµ РѕСЃС‚Р°РІР»РµРЅ")
    review = Review(
        route_date_id=route_date.id,
        booking_id=booking.id,
        author_name=booking.client_name,
        rating=payload.rating,
        comment=payload.comment,
        is_approved=False,
    )
    db.add(review)
    log_action(
        db,
        None,
        "review_create",
        {"route_id": route_id, "route_date_id": route_date.id, "booking_id": booking.id},
    )
    db.commit()
    db.refresh(review)
    return ReviewOut(
        id=review.id,
        route_date_id=review.route_date_id,
        author_name=review.author_name,
        rating=review.rating,
        comment=review.comment,
        is_approved=review.is_approved,
        created_at=review.created_at,
        excursion_starts_at=starts_at,
    )


@router.patch("/{route_id}/reviews/{review_id}", response_model=ReviewOut)
def update_review(
    route_id: int,
    review_id: int,
    payload: ReviewUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_rules(REVIEWS_MODERATE)),
) -> ReviewOut:
    row = (
        db.query(Review, RouteDate)
        .join(RouteDate, Review.route_date_id == RouteDate.id)
        .filter(Review.id == review_id, RouteDate.route_id == route_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РћС‚Р·С‹РІ РЅРµ РЅР°Р№РґРµРЅ")
    review, route_date = row
    if payload.is_approved is not None:
        review.is_approved = payload.is_approved
    log_action(
        db,
        user,
        "review_update",
        {"route_id": route_id, "review_id": review.id, "is_approved": review.is_approved},
    )
    db.commit()
    db.refresh(review)
    return ReviewOut(
        id=review.id,
        route_date_id=review.route_date_id,
        author_name=review.author_name,
        rating=review.rating,
        comment=review.comment,
        is_approved=review.is_approved,
        created_at=review.created_at,
        excursion_starts_at=(route_date.starts_at or datetime.combine(route_date.date, time(0, 0))),
    )


@router.delete("/{route_id}")
def archive_route(
    route_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_rules(ROUTE_MANAGE)),
) -> dict:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ")
    route.is_published = False
    log_action(db, user, "route_archive", {"route_id": route.id})
    db.commit()
    return {"status": "ok"}

