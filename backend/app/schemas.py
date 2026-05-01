from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models import BookingStatus, FormationType, ModerationStatus, PaymentStatus, PointType, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.manager
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6)


class UserOut(UserBase):
    id: int
    created_at: datetime
    rule_ids: list[int] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class RuleBase(BaseModel):
    code: str
    title: str
    description: Optional[str] = None
    error_message: str
    associated_role: Optional[UserRole] = None


class RuleCreate(RuleBase):
    pass


class RuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    error_message: Optional[str] = None
    associated_role: Optional[UserRole] = None


class RuleOut(RuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserRulesUpdate(BaseModel):
    rule_ids: list[int] = Field(default_factory=list)


class TariffBase(BaseModel):
    title: str
    description: Optional[str] = None
    multiplier: float = Field(gt=0)


class TariffCreate(TariffBase):
    pass


class TariffUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    multiplier: Optional[float] = Field(default=None, gt=0)


class TariffOut(TariffBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GuideOut(BaseModel):
    id: int
    full_name: str

    model_config = {"from_attributes": True}


class PhotoBase(BaseModel):
    file_path: str
    sort_order: int
    is_cover: bool = False


class PhotoCreate(PhotoBase):
    pass


class PhotoOut(PhotoBase):
    id: int

    model_config = {"from_attributes": True}


class PointBase(BaseModel):
    title: str
    description: str
    lat: float
    lng: float
    point_type: PointType = PointType.other
    visit_minutes: int = Field(gt=0)
    order_index: int = Field(ge=0)


class PointCreate(PointBase):
    pass


class PointOut(PointBase):
    id: int

    model_config = {"from_attributes": True}


class RouteBase(BaseModel):
    title: str
    description: str
    duration_hours: float = Field(gt=0)
    estimated_duration_min: Optional[int] = Field(default=None, ge=0)
    estimated_length_km: Optional[float] = Field(default=None, ge=0)
    price_adult: float = Field(gt=0)
    price_child: Optional[float] = Field(default=None, gt=0)
    price_group: Optional[float] = Field(default=None, gt=0)
    max_participants: int = Field(gt=0)
    is_published: bool = False
    formation_type: FormationType = FormationType.manual


class RouteCreate(RouteBase):
    points: list[PointCreate] = Field(default_factory=list)
    photos: list[PhotoCreate] = Field(default_factory=list)
    tariff_ids: list[int] = Field(default_factory=list)


class RouteUpdate(RouteBase):
    points: list[PointCreate] = Field(default_factory=list)
    photos: list[PhotoCreate] = Field(default_factory=list)
    tariff_ids: list[int] = Field(default_factory=list)


class RouteOut(RouteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    geometry_geojson: Optional[dict] = None
    points: list[PointOut]
    photos: list[PhotoOut]
    rating_avg: Optional[float] = None
    rating_count: int = 0
    tariffs: list[TariffOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class RouteListItem(BaseModel):
    id: int
    title: str
    description: str
    duration_hours: float
    estimated_duration_min: Optional[int] = None
    estimated_length_km: Optional[float] = None
    price_adult: float
    max_participants: int
    is_published: bool
    cover_photo: Optional[str] = None
    rating_avg: Optional[float] = None
    rating_count: int = 0

    model_config = {"from_attributes": True}


class RouteDateBase(BaseModel):
    date: date
    starts_at: Optional[datetime] = None
    guide_id: Optional[int] = None


class RouteDateCreate(RouteDateBase):
    guide_id: int


class RouteDateUpdate(BaseModel):
    is_active: Optional[bool] = None
    date: Optional[date] = None
    starts_at: Optional[datetime] = None
    guide_id: Optional[int] = None


class RouteDateOut(RouteDateBase):
    id: int
    route_id: int
    is_active: bool
    is_booked: bool
    created_at: datetime
    guide_name: Optional[str] = None

    model_config = {"from_attributes": True}


class BookingCreate(BaseModel):
    route_id: int
    client_name: str
    phone: str
    email: EmailStr
    desired_date: date
    participants: int = Field(gt=0)
    comment: Optional[str] = None
    consent: bool = True


class BookingOut(BaseModel):
    id: int
    code: str
    route_id: int
    client_name: str
    phone: str
    email: EmailStr
    desired_date: date
    participants: int
    comment: Optional[str]
    status: BookingStatus
    payment_status: PaymentStatus = PaymentStatus.not_required
    created_at: datetime
    updated_at: Optional[datetime] = None
    status_updated_at: datetime
    internal_notes: Optional[str]

    model_config = {"from_attributes": True}


class BookingListItem(BaseModel):
    id: int
    code: str
    route_id: int
    route_title: str
    client_name: str
    desired_date: date
    participants: int
    status: BookingStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingUpdate(BaseModel):
    status: Optional[BookingStatus] = None
    internal_notes: Optional[str] = None


class BookingDetail(BookingOut):
    route_title: str


class ReviewCreate(BaseModel):
    route_date_id: int
    booking_code: str
    email: EmailStr
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewUpdate(BaseModel):
    is_approved: Optional[bool] = None


class ReviewOut(BaseModel):
    id: int
    route_date_id: int
    author_name: str
    rating: int
    comment: Optional[str]
    moderation_status: ModerationStatus = ModerationStatus.pending
    show_on_site: bool = False
    is_approved: bool
    created_at: datetime
    excursion_starts_at: datetime

    model_config = {"from_attributes": True}


Token.model_rebuild()


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class PointCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class PointCategoryCreate(PointCategoryBase):
    pass


class PointCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class PointCategoryOut(PointCategoryBase):
    id: int

    model_config = {"from_attributes": True}


class PointOfInterestBase(BaseModel):
    category_id: Optional[int] = None
    name: str
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    lat: float
    lon: float
    active: bool = True
    source: Optional[str] = None
    source_url: Optional[str] = None


class PointOfInterestCreate(PointOfInterestBase):
    pass


class PointOfInterestUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    active: Optional[bool] = None
    source: Optional[str] = None
    source_url: Optional[str] = None


class PointOfInterestOut(PointOfInterestBase):
    id: int
    category: Optional[PointCategoryOut] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OverpassImportRequest(BaseModel):
    south: float = 54.65
    west: float = 55.80
    north: float = 54.85
    east: float = 56.15
    activate: bool = False
    limit: int = Field(default=100, ge=1, le=500)


class RoutePlanPoint(BaseModel):
    name: str
    lon: float
    lat: float
    facts: Optional[str] = None


class RoutePlanRequest(BaseModel):
    points: list[RoutePlanPoint] = Field(min_length=2)
    algorithm: Optional[str] = None
    start_index: int = 0
    finish_index: Optional[int] = None


class RouteLegOut(BaseModel):
    from_name: str
    to_name: str
    distance_km: float
    duration_min: float


class RoutePlanOut(BaseModel):
    algorithm: str
    order: list[int]
    ordered_points: list[RoutePlanPoint]
    distance_km: float
    duration_min: float
    geometry_geojson: Optional[dict] = None
    legs: list[RouteLegOut] = Field(default_factory=list)
    fallback: bool = False
    message: Optional[str] = None


class RouteCalculateRequest(BaseModel):
    algorithm: Optional[str] = None
    persist_order: bool = True


class TourDescriptionRequest(BaseModel):
    title: str
    points: list[RoutePlanPoint]
    duration_min: Optional[float] = None
    distance_km: Optional[float] = None
    constraints: Optional[str] = None


class TourDescriptionOut(BaseModel):
    description: str
    provider: str
    model: str
    fallback: bool = False
    message: Optional[str] = None


class ExcursionRouteOut(BaseModel):
    id: int
    route_id: int
    order_number: int
    route: Optional[RouteOut] = None

    model_config = {"from_attributes": True}


class ExcursionMediaOut(BaseModel):
    id: int
    file_path: str
    file_type: str

    model_config = {"from_attributes": True}


class ExcursionBase(BaseModel):
    title: str
    description: str
    base_price: float = Field(ge=0)
    max_participants: int = Field(gt=0)
    published: bool = False


class ExcursionCreate(ExcursionBase):
    route_ids: list[int] = Field(default_factory=list)


class ExcursionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = Field(default=None, ge=0)
    max_participants: Optional[int] = Field(default=None, gt=0)
    published: Optional[bool] = None
    route_ids: Optional[list[int]] = None


class ExcursionOut(ExcursionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    routes: list[ExcursionRouteOut] = Field(default_factory=list)
    media: list[ExcursionMediaOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ExcursionListItem(BaseModel):
    id: int
    title: str
    description: str
    base_price: float
    max_participants: int
    published: bool
    route_count: int = 0
    cover_photo: Optional[str] = None


class ExcursionSessionCreate(BaseModel):
    excursion_id: int
    guide_user_id: Optional[int] = None
    starts_at: datetime


class ExcursionSessionUpdate(BaseModel):
    guide_user_id: Optional[int] = None
    starts_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ExcursionSessionOut(BaseModel):
    id: int
    excursion_id: int
    guide_user_id: Optional[int] = None
    starts_at: datetime
    completed_at: Optional[datetime] = None
    guide_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentMarkRequest(BaseModel):
    payment_status: PaymentStatus
