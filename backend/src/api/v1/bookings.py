from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.v1.dependencies.auth import CurrentUser, require_any_role
from src.api.v1.dependencies.db import DBDep
from src.models.domain import Booking
from src.schemas.domain import BookingCreate, BookingRead, BookingStatusUpdate
from src.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["bookings"])
staff_dep = Depends(require_any_role("dispatcher", "manager", "accountant", "admin", "superuser"))


@router.post("", response_model=BookingRead)
async def create_booking(db: DBDep, data: BookingCreate) -> Booking:
    return await BookingService(db).create_booking(data)


@router.get("", response_model=list[BookingRead], dependencies=[staff_dep])
async def list_bookings(db: DBDep, offset: int = 0, limit: int = 100) -> list[Booking]:
    result = await db.session.execute(
        select(Booking)
        .options(selectinload(Booking.session), selectinload(Booking.excursion))
        .order_by(Booking.id.desc())
        .offset(offset)
        .limit(limit)
    )
    bookings = list(result.scalars().all())
    for booking in bookings:
        _attach_booking_view_fields(booking)
    return bookings


@router.get("/{booking_id}", response_model=BookingRead, dependencies=[staff_dep])
async def get_booking(db: DBDep, booking_id: int) -> Booking:
    result = await db.session.execute(
        select(Booking)
        .options(selectinload(Booking.session), selectinload(Booking.excursion))
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    _attach_booking_view_fields(booking)
    return booking


@router.put("/{booking_id}/status", response_model=BookingRead, dependencies=[staff_dep])
async def update_booking_status(db: DBDep, booking_id: int, data: BookingStatusUpdate) -> Booking:
    booking = await db.session.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(booking, key, value)
    await db.commit()
    await db.session.refresh(booking)
    result = await db.session.execute(
        select(Booking)
        .options(selectinload(Booking.session), selectinload(Booking.excursion))
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one()
    _attach_booking_view_fields(booking)
    return booking


@router.post("/{booking_id}/mock-payment", response_model=BookingRead)
async def mock_payment(db: DBDep, booking_id: int) -> Booking:
    try:
        return await BookingService(db).confirm_mock_payment(booking_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/me", response_model=BookingRead)
async def create_my_booking(db: DBDep, user: CurrentUser, data: BookingCreate) -> Booking:
    return await BookingService(db).create_booking(data, client_id=user.id)


def _attach_booking_view_fields(booking: Booking) -> None:
    booking.excursion_title = booking.excursion.title if booking.excursion else None
    booking.session_date = booking.session.session_date if booking.session else None
    booking.start_time = booking.session.start_time if booking.session else None
