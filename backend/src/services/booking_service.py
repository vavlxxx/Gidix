from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select

from src.models.domain import Booking, Excursion
from src.schemas.domain import BookingCreate
from src.utils.db_tools import DBManager


class BookingService:
    def __init__(self, db: DBManager) -> None:
        self.db = db

    async def create_booking(self, data: BookingCreate, client_id: int | None = None) -> Booking:
        excursion = None
        if data.excursion_id:
            result = await self.db.session.execute(select(Excursion).where(Excursion.id == data.excursion_id))
            excursion = result.scalar_one_or_none()
        base_price = excursion.base_price if excursion else Decimal("0.00")
        booking = Booking(
            client_id=client_id,
            session_id=data.session_id,
            excursion_id=data.excursion_id,
            customer_name=data.customer_name,
            customer_phone=data.customer_phone or None,
            customer_email=str(data.customer_email) if data.customer_email else None,
            participants_count=data.participants_count,
            total_price=base_price * data.participants_count,
            status="pending",
            payment_status="pending",
            comment=data.comment,
        )
        self.db.session.add(booking)
        await self.db.commit()
        await self.db.session.refresh(booking)
        return booking

    async def confirm_mock_payment(self, booking_id: int) -> Booking:
        result = await self.db.session.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        if booking is None:
            raise ValueError("Booking not found")
        booking.payment_status = "paid"
        booking.status = "confirmed"
        await self.db.commit()
        await self.db.session.refresh(booking)
        return booking
