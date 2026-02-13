from datetime import datetime
import enum

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.types import Enum as SqlEnum
from geoalchemy2 import Geometry

Base = declarative_base()


class UserRole(str, enum.Enum):
    manager = "manager"
    admin = "admin"


class BookingStatus(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    confirmed = "confirmed"
    canceled = "canceled"


class PointType(str, enum.Enum):
    museum = "museum"
    temple = "temple"
    monument = "monument"
    nature = "nature"
    park = "park"
    cafe = "cafe"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(SqlEnum(UserRole), nullable=False, default=UserRole.manager)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    logs = relationship("AuditLog", back_populates="user")


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    duration_hours = Column(Float, nullable=False)
    price_adult = Column(Float, nullable=False)
    price_child = Column(Float, nullable=True)
    price_group = Column(Float, nullable=True)
    max_participants = Column(Integer, nullable=False)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    points = relationship("Point", back_populates="route", cascade="all, delete-orphan", order_by="Point.order_index")
    photos = relationship("Photo", back_populates="route", cascade="all, delete-orphan", order_by="Photo.sort_order")
    available_dates = relationship(
        "RouteDate",
        back_populates="route",
        cascade="all, delete-orphan",
        order_by="RouteDate.date",
    )
    bookings = relationship("Booking", back_populates="route")


class RouteDate(Base):
    __tablename__ = "route_dates"
    __table_args__ = (UniqueConstraint("route_id", "date", name="uq_route_date"),)

    id = Column(Integer, primary_key=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)
    is_booked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    route = relationship("Route", back_populates="available_dates")


class Point(Base):
    __tablename__ = "points"

    id = Column(Integer, primary_key=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    geom = Column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=True)
    point_type = Column(SqlEnum(PointType), nullable=False, default=PointType.other)
    visit_minutes = Column(Integer, nullable=False)
    order_index = Column(Integer, nullable=False)

    route = relationship("Route", back_populates="points")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(300), nullable=False)
    sort_order = Column(Integer, nullable=False)
    is_cover = Column(Boolean, default=False)

    route = relationship("Route", back_populates="photos")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    client_name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(200), nullable=False)
    desired_date = Column(Date, nullable=False)
    participants = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    status = Column(SqlEnum(BookingStatus), nullable=False, default=BookingStatus.new)
    created_at = Column(DateTime, default=datetime.utcnow)
    status_updated_at = Column(DateTime, default=datetime.utcnow)
    internal_notes = Column(Text, nullable=True)

    route = relationship("Route", back_populates="bookings")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(200), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="logs")
