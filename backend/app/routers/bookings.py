from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import require_roles
from app.db import get_db
from app.models import Booking, BookingStatus, Route
from app.schemas import BookingCreate, BookingDetail, BookingListItem, BookingOut, BookingUpdate
from app.utils import generate_booking_code

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("/", response_model=BookingOut)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)) -> BookingOut:
    if not payload.consent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Требуется согласие на обработку данных")
    route = db.query(Route).filter(Route.id == payload.route_id, Route.is_published.is_(True)).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Маршрут не найден")
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
        booking.status = payload.status
        booking.status_updated_at = datetime.utcnow()
    if payload.internal_notes is not None:
        booking.internal_notes = payload.internal_notes
    log_action(db, user, "booking_update", {"booking_id": booking.id, "status": payload.status})
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)
