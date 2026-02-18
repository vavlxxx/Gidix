from datetime import datetime
import enum

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.types import Enum as SqlEnum
from geoalchemy2 import Geometry

Base = declarative_base()


class UserRole(str, enum.Enum):
    superuser = "superuser"
    manager = "manager"
    admin = "admin"
    guide = "guide"


class BookingStatus(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    confirmed = "confirmed"
    completed = "completed"
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
    guided_dates = relationship("RouteDate", back_populates="guide", foreign_keys="RouteDate.guide_id")
    rules = relationship("Rule", secondary="user_rules", back_populates="users")

    @property
    def rule_ids(self) -> list[int]:
        return [rule.id for rule in self.rules]


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True)
    associated_role = Column(SqlEnum(UserRole), nullable=True)
    code = Column(String(120), unique=True, nullable=False)
    title = Column(String(200), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    error_message = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", secondary="user_rules", back_populates="rules")


class UserRule(Base):
    __tablename__ = "user_rules"
    __table_args__ = (UniqueConstraint("user_id", "rule_id", name="user_assosiated_rule_unique"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(Integer, ForeignKey("rules.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Tariff(Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    multiplier = Column(Float, nullable=False, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    routes = relationship("Route", secondary="route_tariffs", back_populates="tariffs")


class RouteTariff(Base):
    __tablename__ = "route_tariffs"
    __table_args__ = (UniqueConstraint("route_id", "tariff_id", name="route_tariff_unique"),)

    id = Column(Integer, primary_key=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    tariff_id = Column(Integer, ForeignKey("tariffs.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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
    tariffs = relationship("Tariff", secondary="route_tariffs", back_populates="routes")


class RouteDate(Base):
    __tablename__ = "route_dates"
    __table_args__ = (UniqueConstraint("route_id", "date", name="uq_route_date"),)

    id = Column(Integer, primary_key=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    guide_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, nullable=False)
    starts_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    is_booked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    route = relationship("Route", back_populates="available_dates")
    reviews = relationship("Review", back_populates="route_date", cascade="all, delete-orphan")
    guide = relationship("User", back_populates="guided_dates", foreign_keys=[guide_id])

    @property
    def guide_name(self) -> str | None:
        return self.guide.full_name if self.guide else None


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
    reviews = relationship("Review", back_populates="booking")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("route_date_id", "booking_id", name="uq_review_route_date_booking"),)

    id = Column(Integer, primary_key=True)
    route_date_id = Column(Integer, ForeignKey("route_dates.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    author_name = Column(String(200), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    route_date = relationship("RouteDate", back_populates="reviews")
    booking = relationship("Booking", back_populates="reviews")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(200), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="logs")
