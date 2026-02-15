from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import require_roles
from app.db import get_db
from app.models import Booking, BookingStatus, Route, RouteDate
from app.schemas import BookingCreate, BookingDetail, BookingListItem, BookingOut, BookingUpdate
from app.utils import generate_booking_code

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

BOOKED_STATUSES = {BookingStatus.confirmed, BookingStatus.completed}


def _starts_at_value(route_date: RouteDate) -> datetime:
    return route_date.starts_at or datetime.combine(route_date.date, time(0, 0))


def _booked_participants(db: Session, route_id: int, desired_date: date, exclude_booking_id: int | None = None) -> int:
    query = (
        db.query(func.coalesce(func.sum(Booking.participants), 0))
        .filter(
            Booking.route_id == route_id,
            Booking.desired_date == desired_date,
            Booking.status.in_(BOOKED_STATUSES),
        )
    )
    if exclude_booking_id:
        query = query.filter(Booking.id != exclude_booking_id)
    return int(query.scalar() or 0)


@router.post("/", response_model=BookingOut)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)) -> BookingOut:
    if not payload.consent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Требуется согласие на обработку данных")
    route = db.query(Route).filter(Route.id == payload.route_id, Route.is_published.is_(True)).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
    route_date = (
        db.query(RouteDate)
        .filter(
            RouteDate.route_id == payload.route_id,
            RouteDate.date == payload.desired_date,
            RouteDate.is_active.is_(True),
        )
        .first()
    )
    if not route_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Выберите дату из доступных")
    starts_at = _starts_at_value(route_date)
    if starts_at < datetime.now() + timedelta(hours=24):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Бронь доступна не позднее чем за 24 часа до начала экскурсии",
        )
    booked_count = _booked_participants(db, payload.route_id, payload.desired_date)
    available = route.max_participants - booked_count
    if available <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Дата полностью занята")
    if payload.participants > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недостаточно свободных мест на выбранную дату",
        )
    if payload.participants > route.max_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Количество участников превышает вместимость группы",
        )

    booking = Booking(
        code=generate_booking_code(db),
        route_id=payload.route_id,
        client_name=payload.client_name,
        phone=payload.phone,
        email=payload.email,
        desired_date=payload.desired_date,
        participants=payload.participants,
        comment=payload.comment,
        status=BookingStatus.new,
    )
    db.add(booking)
    log_action(db, None, "booking_create", {"route_id": payload.route_id})
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


@router.get("/", response_model=list[BookingListItem])
def list_bookings(
    status: BookingStatus | None = None,
    route_id: int | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> list[BookingListItem]:
    query = db.query(Booking, Route.title).join(Route, Booking.route_id == Route.id)
    if status:
        query = query.filter(Booking.status == status)
    if route_id:
        query = query.filter(Booking.route_id == route_id)
    if date_from:
        query = query.filter(Booking.desired_date >= date_from)
    if date_to:
        query = query.filter(Booking.desired_date <= date_to)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Booking.client_name.ilike(like),
                Booking.phone.ilike(like),
                Booking.code.ilike(like),
            )
        )
    rows = query.order_by(Booking.created_at.desc()).all()
    return [
        BookingListItem(
            id=booking.id,
            code=booking.code,
            route_id=booking.route_id,
            route_title=route_title,
            client_name=booking.client_name,
            desired_date=booking.desired_date,
            participants=booking.participants,
            status=booking.status,
            created_at=booking.created_at,
        )
        for booking, route_title in rows
    ]


@router.get("/{booking_id}", response_model=BookingDetail)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> BookingDetail:
    row = (
        db.query(Booking, Route.title)
        .join(Route, Booking.route_id == Route.id)
        .filter(Booking.id == booking_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заявка не найдена")
    booking, route_title = row
    data = BookingOut.model_validate(booking)
    return BookingDetail(**data.model_dump(), route_title=route_title)


@router.patch("/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: int,
    payload: BookingUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("manager", "admin")),
) -> BookingOut:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заявка не найдена")
    if payload.status:
        previous_status = booking.status
        next_status = payload.status
        if next_status in BOOKED_STATUSES and previous_status not in BOOKED_STATUSES:
            route_date = (
                db.query(RouteDate)
                .filter(
                    RouteDate.route_id == booking.route_id,
                    RouteDate.date == booking.desired_date,
                    RouteDate.is_active.is_(True),
                )
                .first()
            )
            if not route_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Дата больше недоступна для бронирования",
                )
            route = db.query(Route).filter(Route.id == booking.route_id).first()
            if not route:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
            booked_count = _booked_participants(db, booking.route_id, booking.desired_date)
            if booked_count + booking.participants > route.max_participants:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Недостаточно свободных мест на выбранную дату",
                )
            route_date.is_booked = booked_count + booking.participants >= route.max_participants
        if previous_status in BOOKED_STATUSES and next_status not in BOOKED_STATUSES:
            route_date = (
                db.query(RouteDate)
                .filter(
                    RouteDate.route_id == booking.route_id,
                    RouteDate.date == booking.desired_date,
                )
                .first()
            )
            if route_date:
                route = db.query(Route).filter(Route.id == booking.route_id).first()
                if route:
                    booked_count = _booked_participants(
                        db,
                        booking.route_id,
                        booking.desired_date,
                        exclude_booking_id=booking.id,
                    )
                    route_date.is_booked = booked_count >= route.max_participants
        booking.status = next_status
        booking.status_updated_at = datetime.utcnow()
    if payload.internal_notes is not None:
        booking.internal_notes = payload.internal_notes
    log_action(db, user, "booking_update", {"booking_id": booking.id, "status": payload.status})
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)
