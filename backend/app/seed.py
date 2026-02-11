from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Booking, BookingStatus, Point, PointType, Photo, Route, User, UserRole
from app.utils import generate_booking_code


def seed_if_needed(db: Session) -> None:
    if db.query(User).first():
        return

    admin = User(
        full_name="Администратор",
        email=settings.default_admin_email,
        hashed_password=get_password_hash(settings.default_admin_password),
        role=UserRole.admin,
        is_active=True,
    )
    manager = User(
        full_name="Менеджер",
        email="manager@example.com",
        hashed_password=get_password_hash("manager123"),
        role=UserRole.manager,
        is_active=True,
    )
    db.add_all([admin, manager])
    db.flush()

    route1 = Route(
        title="Исторический центр города",
        description="Экскурсия по ключевым местам старого города с посещением музеев и памятников.",
        duration_hours=3.5,
        price_adult=1500,
        price_child=1200,
        max_participants=20,
        is_published=True,
    )
    route1.points = [
        Point(
            title="Краеведческий музей",
            description="Основная экспозиция о истории региона.",
            lat=55.751244,
            lng=37.618423,
            point_type=PointType.museum,
            visit_minutes=45,
            order_index=0,
        ),
        Point(
            title="Площадь старого города",
            description="Главная площадь с исторической застройкой.",
            lat=55.75393,
            lng=37.620795,
            point_type=PointType.monument,
            visit_minutes=30,
            order_index=1,
        ),
        Point(
            title="Панорамная площадка",
            description="Вид на центральные кварталы.",
            lat=55.7562,
            lng=37.6156,
            point_type=PointType.park,
            visit_minutes=25,
            order_index=2,
        ),
    ]
    route1.photos = [
        Photo(file_path="/media/sample-1.svg", sort_order=0, is_cover=True),
        Photo(file_path="/media/sample-2.svg", sort_order=1, is_cover=False),
    ]

    route2 = Route(
        title="Природные красоты парка",
        description="Маршрут с посещением природных достопримечательностей и зон отдыха.",
        duration_hours=5.0,
        price_adult=2200,
        price_child=1800,
        max_participants=15,
        is_published=True,
    )
    route2.points = [
        Point(
            title="Входной павильон",
            description="Старт маршрута и сбор группы.",
            lat=55.7622,
            lng=37.6003,
            point_type=PointType.other,
            visit_minutes=15,
            order_index=0,
        ),
        Point(
            title="Смотровая тропа",
            description="Маршрут через хвойные участки парка.",
            lat=55.7644,
            lng=37.595,
            point_type=PointType.nature,
            visit_minutes=60,
            order_index=1,
        ),
        Point(
            title="Зона отдыха у воды",
            description="Короткая остановка для фото.",
            lat=55.7661,
            lng=37.5901,
            point_type=PointType.park,
            visit_minutes=30,
            order_index=2,
        ),
    ]
    route2.photos = [
        Photo(file_path="/media/sample-3.svg", sort_order=0, is_cover=True),
    ]

    db.add_all([route1, route2])
    db.flush()

    booking1 = Booking(
        code=generate_booking_code(db),
        route_id=route1.id,
        client_name="Иван Петров",
        phone="+7 (900) 555-12-34",
        email="ivan@example.com",
        desired_date=date.today() + timedelta(days=5),
        participants=4,
        comment="Хотим семейную экскурсию.",
        status=BookingStatus.new,
    )
    db.add(booking1)
    db.flush()
    booking2 = Booking(
        code=generate_booking_code(db),
        route_id=route2.id,
        client_name="Мария Иванова",
        phone="+7 (901) 222-33-44",
        email="maria@example.com",
        desired_date=date.today() + timedelta(days=10),
        participants=2,
        comment="Интересует индивидуальный гид.",
        status=BookingStatus.in_progress,
    )

    db.add(booking2)
    db.commit()
