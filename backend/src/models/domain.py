from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.auth import User
from src.models.base import Base


class PointCategory(Base):
    __tablename__ = "point_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    points: Mapped[list["PointOfInterest"]] = relationship(back_populates="category")


class PointOfInterest(Base):
    __tablename__ = "points_of_interest"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("point_categories.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    short_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    full_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float] = mapped_column(Numeric(10, 7))
    longitude: Mapped[float] = mapped_column(Numeric(10, 7))
    visit_duration_min: Mapped[int] = mapped_column(Integer, default=15)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extra: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped[PointCategory | None] = relationship(back_populates="points")
    route_links: Mapped[list["RoutePoint"]] = relationship(back_populates="point", cascade="all, delete-orphan")


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_point_id: Mapped[int | None] = mapped_column(ForeignKey("points_of_interest.id"), nullable=True)
    finish_point_id: Mapped[int | None] = mapped_column(ForeignKey("points_of_interest.id"), nullable=True)
    estimated_duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_length_km: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    formation_type: Mapped[str] = mapped_column(String(50), default="manual")
    optimization_algorithm: Mapped[str | None] = mapped_column(String(100), nullable=True)
    geometry_geojson: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    route_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    points: Mapped[list["RoutePoint"]] = relationship(back_populates="route", cascade="all, delete-orphan", lazy="selectin")
    excursions: Mapped[list["Excursion"]] = relationship(back_populates="route")


class RoutePoint(Base):
    __tablename__ = "route_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id", ondelete="CASCADE"), index=True)
    point_id: Mapped[int] = mapped_column(ForeignKey("points_of_interest.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    visit_duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    route: Mapped[Route] = relationship(back_populates="points")
    point: Mapped[PointOfInterest] = relationship(back_populates="route_links", lazy="selectin")

    __table_args__ = (UniqueConstraint("route_id", "position", name="uq_route_points_route_id_position"),)


class Excursion(Base):
    __tablename__ = "excursions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    route_id: Mapped[int | None] = mapped_column(ForeignKey("routes.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    meeting_point: Mapped[str | None] = mapped_column(String(500), nullable=True)
    max_participants: Mapped[int] = mapped_column(Integer, default=20)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    route: Mapped[Route | None] = relationship(back_populates="excursions", lazy="selectin")
    sessions: Mapped[list["GuideSession"]] = relationship(back_populates="excursion", cascade="all, delete-orphan")
    reviews: Mapped[list["Review"]] = relationship(back_populates="excursion", cascade="all, delete-orphan")


class GuideSession(Base):
    __tablename__ = "guide_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    excursion_id: Mapped[int] = mapped_column(ForeignKey("excursions.id", ondelete="CASCADE"), index=True)
    guide_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    session_date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    capacity: Mapped[int] = mapped_column(Integer, default=20)
    status: Mapped[str] = mapped_column(String(30), default="scheduled")

    excursion: Mapped[Excursion] = relationship(back_populates="sessions", lazy="selectin")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="session")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("guide_sessions.id"), nullable=True)
    excursion_id: Mapped[int | None] = mapped_column(ForeignKey("excursions.id"), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(255))
    customer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    participants_count: Mapped[int] = mapped_column(Integer, default=1)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    status: Mapped[str] = mapped_column(String(30), default="pending")
    payment_status: Mapped[str] = mapped_column(String(30), default="pending")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    client: Mapped[User | None] = relationship(back_populates="bookings", foreign_keys=[client_id])
    session: Mapped[GuideSession | None] = relationship(back_populates="bookings", lazy="selectin")
    excursion: Mapped[Excursion | None] = relationship(lazy="selectin")


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    excursion_id: Mapped[int] = mapped_column(ForeignKey("excursions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rating: Mapped[int] = mapped_column(Integer)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False)

    excursion: Mapped[Excursion] = relationship(back_populates="reviews")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    url: Mapped[str] = mapped_column(String(1000))
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(100), nullable=True)


class GeneratedDescriptionSource(Base):
    __tablename__ = "generated_description_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    entity_type: Mapped[str] = mapped_column(String(50), default="excursion")
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(100))
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    facts: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
