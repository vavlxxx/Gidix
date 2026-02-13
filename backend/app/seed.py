from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Booking, BookingStatus, Point, PointType, Photo, Route, RouteDate, User, UserRole
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
        title="Исторический центр Уфы",
        description=(
            "Пешеходный маршрут по главным городским символам: Гостиный двор, театр, музей и"
            " панорамный памятник Салавату Юлаеву."
        ),
        duration_hours=3.0,
        price_adult=1400,
        price_child=1000,
        max_participants=20,
        is_published=True,
    )
    route1.points = [
        Point(
            title="Гостиный двор",
            description="Исторический торговый комплекс и место для прогулок в центре.",
            lat=54.7249825,
            lng=55.9441737,
            point_type=PointType.monument,
            visit_minutes=35,
            order_index=0,
        ),
        Point(
            title="Театр оперы и балета",
            description="Культурный центр Уфы с архитектурой середины XX века.",
            lat=54.7225891,
            lng=55.9444937,
            point_type=PointType.monument,
            visit_minutes=30,
            order_index=1,
        ),
        Point(
            title="Национальный музей Республики Башкортостан",
            description="Экспозиции о природе, культуре и истории Башкортостана.",
            lat=54.7199636,
            lng=55.9502233,
            point_type=PointType.museum,
            visit_minutes=40,
            order_index=2,
        ),
        Point(
            title="Памятник Салавату Юлаеву",
            description="Самая узнаваемая панорама города над рекой Белой.",
            lat=54.7184771,
            lng=55.9258453,
            point_type=PointType.monument,
            visit_minutes=35,
            order_index=3,
        ),
    ]
    route1.photos = [
        Photo(file_path="/media/sample-1.svg", sort_order=0, is_cover=True),
        Photo(file_path="/media/sample-2.svg", sort_order=1, is_cover=False),
    ]

    route2 = Route(
        title="Парки и панорамы Уфы",
        description=(
            "Маршрут для неспешной прогулки по зеленым зонам и обзорным точкам Уфы."
            " Подходит для семей и небольших групп."
        ),
        duration_hours=4.5,
        price_adult=1800,
        price_child=1300,
        max_participants=15,
        is_published=True,
    )
    route2.points = [
        Point(
            title="Парк имени Ивана Якутова",
            description="Городской парк с прогулочными аллеями и озером.",
            lat=54.7403639,
            lng=55.9505441,
            point_type=PointType.park,
            visit_minutes=45,
            order_index=0,
        ),
        Point(
            title="Монумент Дружбы",
            description="Знаковый памятник на высоком берегу реки Белой.",
            lat=54.7108518,
            lng=55.9629509,
            point_type=PointType.monument,
            visit_minutes=30,
            order_index=1,
        ),
        Point(
            title="Парк Победы",
            description="Мемориальный парк с панорамными видами и аллеями.",
            lat=54.8232253,
            lng=56.0570749,
            point_type=PointType.park,
            visit_minutes=50,
            order_index=2,
        ),
    ]
    route2.photos = [
        Photo(file_path="/media/sample-3.svg", sort_order=0, is_cover=True),
    ]

    db.add_all([route1, route2])
    db.flush()

    today = date.today()
    route_dates = [
        RouteDate(route_id=route1.id, date=today + timedelta(days=5)),
        RouteDate(route_id=route1.id, date=today + timedelta(days=7)),
        RouteDate(route_id=route1.id, date=today + timedelta(days=9)),
        RouteDate(route_id=route1.id, date=today + timedelta(days=14)),
        RouteDate(route_id=route2.id, date=today + timedelta(days=10)),
        RouteDate(route_id=route2.id, date=today + timedelta(days=12)),
        RouteDate(route_id=route2.id, date=today + timedelta(days=16)),
    ]
    db.add_all(route_dates)
    db.flush()

    booking1 = Booking(
        code=generate_booking_code(db),
        route_id=route1.id,
        client_name="Айдар Хусаинов",
        phone="+7 (927) 555-11-22",
        email="aidar@example.com",
        desired_date=date.today() + timedelta(days=7),
        participants=3,
        comment="Интересует утренний старт и фотостопы.",
        status=BookingStatus.new,
    )
    db.add(booking1)
    db.flush()

    booking2 = Booking(
        code=generate_booking_code(db),
        route_id=route2.id,
        client_name="Диана Сафина",
        phone="+7 (917) 222-33-44",
        email="diana@example.com",
        desired_date=date.today() + timedelta(days=12),
        participants=2,
        comment="Нужен детский тариф и спокойный темп.",
        status=BookingStatus.in_progress,
    )

    db.add(booking2)
    db.commit()
