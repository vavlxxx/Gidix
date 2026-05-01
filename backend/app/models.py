from datetime import datetime
import enum

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.types import Enum as SqlEnum
from geoalchemy2 import Geometry

Base = declarative_base()


class UserRole(str, enum.Enum):
    client = "client"
    dispatcher = "dispatcher"
    superuser = "superuser"
    manager = "manager"
    accountant = "accountant"
    admin = "admin"
    guide = "guide"


class BookingStatus(str, enum.Enum):
    new = "new"
    checking = "checking"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"
    in_progress = "in_progress"
    confirmed = "confirmed"
    completed = "completed"
    canceled = "canceled"


class PaymentStatus(str, enum.Enum):
    not_required = "not_required"
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class FormationType(str, enum.Enum):
    manual = "manual"
    automatic = "automatic"
    mixed = "mixed"


class ModerationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


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
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    middle_name = Column(String(100), nullable=True)
    email = Column(String(200), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(200), nullable=False)
    password_hash = Column(String(200), nullable=True)
    role = Column(SqlEnum(UserRole), nullable=False, default=UserRole.manager)
    is_active = Column(Boolean, default=True)
    active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    logs = relationship("AuditLog", back_populates="user")
    guided_dates = relationship("RouteDate", back_populates="guide", foreign_keys="RouteDate.guide_id")
    guided_sessions = relationship("ExcursionSession", back_populates="guide", foreign_keys="ExcursionSession.guide_user_id")
    rules = relationship("Rule", secondary="user_rules", back_populates="users")
    role_links = relationship("UserRoleLink", back_populates="user", cascade="all, delete-orphan")

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


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    user_links = relationship("UserRoleLink", back_populates="role", cascade="all, delete-orphan")


class UserRoleLink(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="user_role_unique"),)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="role_links")
    role = relationship("Role", back_populates="user_links")


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
    name = Column(String(200), nullable=True)
    description = Column(Text, nullable=False)
    duration_hours = Column(Float, nullable=False)
    estimated_duration_min = Column(Integer, nullable=True)
    estimated_length_km = Column(Float, nullable=True)
    price_adult = Column(Float, nullable=False)
    price_child = Column(Float, nullable=True)
    price_group = Column(Float, nullable=True)
    max_participants = Column(Integer, nullable=False)
    is_published = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    formation_type = Column(SqlEnum(FormationType), nullable=False, default=FormationType.manual)
    geometry_geojson = Column(JSON, nullable=True)
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
    poi_links = relationship("RoutePoint", back_populates="route", cascade="all, delete-orphan", order_by="RoutePoint.order_number")
    excursion_links = relationship("ExcursionRoute", back_populates="route", cascade="all, delete-orphan")


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


class PointCategory(Base):
    __tablename__ = "point_categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    points = relationship("PointOfInterest", back_populates="category")


class PointOfInterest(Base):
    __tablename__ = "points_of_interest"
    __table_args__ = (UniqueConstraint("name", "lat", "lon", name="poi_name_coords_unique"),)

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("point_categories.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(220), nullable=False)
    short_description = Column(Text, nullable=True)
    full_description = Column(Text, nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    active = Column(Boolean, default=True)
    source = Column(String(120), nullable=True)
    source_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("PointCategory", back_populates="points")
    route_links = relationship("RoutePoint", back_populates="point", cascade="all, delete-orphan")


class RoutePoint(Base):
    __tablename__ = "route_points"
    __table_args__ = (UniqueConstraint("route_id", "point_id", name="route_point_unique"),)

    id = Column(Integer, primary_key=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    point_id = Column(Integer, ForeignKey("points_of_interest.id", ondelete="CASCADE"), nullable=False)
    order_number = Column(Integer, nullable=False)

    route = relationship("Route", back_populates="poi_links")
    point = relationship("PointOfInterest", back_populates="route_links")


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
    session_id = Column(Integer, ForeignKey("excursion_sessions.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=False)
    client_phone = Column(String(50), nullable=True)
    email = Column(String(200), nullable=False)
    client_email = Column(String(200), nullable=True)
    desired_date = Column(Date, nullable=False)
    participants = Column(Integer, nullable=False)
    participants_count = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    status = Column(SqlEnum(BookingStatus), nullable=False, default=BookingStatus.new)
    booking_status = Column(SqlEnum(BookingStatus), nullable=False, default=BookingStatus.new)
    payment_status = Column(SqlEnum(PaymentStatus), nullable=False, default=PaymentStatus.not_required)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status_updated_at = Column(DateTime, default=datetime.utcnow)
    internal_notes = Column(Text, nullable=True)

    route = relationship("Route", back_populates="bookings")
    reviews = relationship("Review", back_populates="booking")
    session = relationship("ExcursionSession", back_populates="bookings")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("route_date_id", "booking_id", name="uq_review_route_date_booking"),)

    id = Column(Integer, primary_key=True)
    route_date_id = Column(Integer, ForeignKey("route_dates.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    author_name = Column(String(200), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    review_text = Column(Text, nullable=True)
    moderation_status = Column(SqlEnum(ModerationStatus), nullable=False, default=ModerationStatus.pending)
    show_on_site = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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


class Excursion(Base):
    __tablename__ = "excursions"

    id = Column(Integer, primary_key=True)
    title = Column(String(220), nullable=False)
    description = Column(Text, nullable=False)
    base_price = Column(Float, nullable=False, default=0)
    max_participants = Column(Integer, nullable=False, default=10)
    published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    route_links = relationship("ExcursionRoute", back_populates="excursion", cascade="all, delete-orphan", order_by="ExcursionRoute.order_number")
    sessions = relationship("ExcursionSession", back_populates="excursion", cascade="all, delete-orphan")
    media = relationship("ExcursionMedia", back_populates="excursion", cascade="all, delete-orphan")


class ExcursionRoute(Base):
    __tablename__ = "excursion_routes"
    __table_args__ = (UniqueConstraint("excursion_id", "route_id", name="excursion_route_unique"),)

    id = Column(Integer, primary_key=True)
    excursion_id = Column(Integer, ForeignKey("excursions.id", ondelete="CASCADE"), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    order_number = Column(Integer, nullable=False, default=0)

    excursion = relationship("Excursion", back_populates="route_links")
    route = relationship("Route", back_populates="excursion_links")


class ExcursionSession(Base):
    __tablename__ = "excursion_sessions"

    id = Column(Integer, primary_key=True)
    excursion_id = Column(Integer, ForeignKey("excursions.id", ondelete="CASCADE"), nullable=False)
    guide_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    starts_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    excursion = relationship("Excursion", back_populates="sessions")
    guide = relationship("User", back_populates="guided_sessions", foreign_keys=[guide_user_id])
    bookings = relationship("Booking", back_populates="session")

    @property
    def guide_name(self) -> str | None:
        return self.guide.full_name if self.guide else None


class ExcursionMedia(Base):
    __tablename__ = "excursion_media"

    id = Column(Integer, primary_key=True)
    excursion_id = Column(Integer, ForeignKey("excursions.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(300), nullable=False)
    file_type = Column(String(50), nullable=False, default="image")

    excursion = relationship("Excursion", back_populates="media")
