from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models import BookingStatus, PointType, UserRole


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
    price_adult: float = Field(gt=0)
    price_child: Optional[float] = Field(default=None, gt=0)
    price_group: Optional[float] = Field(default=None, gt=0)
    max_participants: int = Field(gt=0)
    is_published: bool = False


class RouteCreate(RouteBase):
    points: list[PointCreate] = Field(default_factory=list)
    photos: list[PhotoCreate] = Field(default_factory=list)


class RouteUpdate(RouteBase):
    points: list[PointCreate] = Field(default_factory=list)
    photos: list[PhotoCreate] = Field(default_factory=list)


class RouteOut(RouteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    points: list[PointOut]
    photos: list[PhotoOut]

    model_config = {"from_attributes": True}


class RouteListItem(BaseModel):
    id: int
    title: str
    description: str
    duration_hours: float
    price_adult: float
    max_participants: int
    is_published: bool
    cover_photo: Optional[str] = None

    model_config = {"from_attributes": True}


class RouteDateBase(BaseModel):
    date: date


class RouteDateCreate(RouteDateBase):
    pass


class RouteDateUpdate(BaseModel):
    is_active: Optional[bool] = None


class RouteDateOut(RouteDateBase):
    id: int
    route_id: int
    is_active: bool
    is_booked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CompletedExcursionBase(BaseModel):
    starts_at: datetime


class CompletedExcursionCreate(CompletedExcursionBase):
    pass


class CompletedExcursionOut(CompletedExcursionBase):
    id: int
    route_id: int
    created_at: datetime

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
    created_at: datetime
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
    excursion_id: int
    booking_code: str
    email: EmailStr
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    excursion_id: int
    author_name: str
    rating: int
    comment: Optional[str]
    created_at: datetime
    excursion_starts_at: datetime

    model_config = {"from_attributes": True}


Token.model_rebuild()
