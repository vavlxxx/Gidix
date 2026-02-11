from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Booking


def generate_booking_code(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"ZAV-{year}-"
    count = db.query(Booking).filter(Booking.code.like(f"{prefix}%")).count() + 1
    return f"{prefix}{count:05d}"
