from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Booking,
    BookingStatus,
    Excursion,
    ExcursionRoute,
    ExcursionSession,
    FormationType,
    Point,
    PointCategory,
    PointOfInterest,
    PointType,
    Photo,
    Role,
    Route,
    RouteDate,
    RoutePoint,
    Rule,
    Tariff,
    User,
    UserRole,
    UserRoleLink,
)
from app.permissions import (
    BOOKING_MANAGE,
    EXCURSIONS_MANAGE,
    GUIDE_ASSIGNMENTS_VIEW,
    INTEGRATIONS_MANAGE,
    PAYMENTS_MANAGE,
    POINTS_MANAGE,
    REVIEWS_MODERATE,
    ROUTE_MANAGE,
    RULES_MANAGE,
    TARIFFS_MANAGE,
    USERS_MANAGE,
    sync_user_rules,
)
from app.utils import generate_booking_code


def _seed_excursions_from_routes(db: Session) -> None:
    poi_by_name = {poi.name: poi for poi in db.query(PointOfInterest).all()}
    for route in db.query(Route).all():
        if not route.name:
            route.name = route.title
        if not route.estimated_duration_min:
            route.estimated_duration_min = int(route.duration_hours * 60)
        if route.active is None:
            route.active = True
        if not route.formation_type:
            route.formation_type = FormationType.manual

        if not route.poi_links:
            for point in route.points:
                poi = poi_by_name.get(point.title)
                if not poi:
                    category = db.query(PointCategory).filter(PointCategory.name == "памятник").first()
                    poi = PointOfInterest(
                        category_id=category.id if category else None,
                        name=point.title,
                        short_description=point.description,
                        full_description=point.description,
                        lat=point.lat,
                        lon=point.lng,
                        active=True,
                        source="seed:route",
                    )
                    db.add(poi)
                    db.flush()
                    poi_by_name[poi.name] = poi
                db.add(RoutePoint(route_id=route.id, point_id=poi.id, order_number=point.order_index))

        exists = db.query(Excursion).filter(Excursion.title == route.title).first()
        if exists:
            continue
        excursion = Excursion(
            title=route.title,
            description=route.description,
            base_price=route.price_adult,
            max_participants=route.max_participants,
            published=route.is_published,
        )
        db.add(excursion)
        db.flush()
        db.add(ExcursionRoute(excursion_id=excursion.id, route_id=route.id, order_number=0))
        for route_date in route.available_dates:
            starts_at = route_date.starts_at or datetime.combine(route_date.date, datetime.min.time())
            db.add(
                ExcursionSession(
                    excursion_id=excursion.id,
                    guide_user_id=route_date.guide_id,
                    starts_at=starts_at,
                )
            )


def seed_if_needed(db: Session) -> None:
    has_users = db.query(User).first() is not None

    if not has_users:
        superuser = User(
            full_name="Суперпользователь",
            email="superuser@example.com",
            hashed_password=get_password_hash("superuser123"),
            role=UserRole.superuser,
            is_active=True,
        )
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
        dispatcher = User(
            full_name="Диспетчер",
            email="dispatcher@example.com",
            hashed_password=get_password_hash("dispatcher123"),
            role=UserRole.dispatcher,
            is_active=True,
        )
        accountant = User(
            full_name="Бухгалтер",
            email="accountant@example.com",
            hashed_password=get_password_hash("accountant123"),
            role=UserRole.accountant,
            is_active=True,
        )
        guide1 = User(
            full_name="РђР»РёСЃР° Р’РµСЂРЅРµСЂ",
            email="guide1@example.com",
            hashed_password=get_password_hash("guide123"),
            role=UserRole.guide,
            is_active=True,
        )
        guide2 = User(
            full_name="РўРёРјСѓСЂ РҐР°С„РёР·РѕРІ",
            email="guide2@example.com",
            hashed_password=get_password_hash("guide123"),
            role=UserRole.guide,
            is_active=True,
        )
        db.add_all([superuser, admin, manager, dispatcher, accountant, guide1, guide2])
        db.flush()

    role_descriptions = {
        "client": "Клиент публичной части",
        "dispatcher": "Первичная обработка заявок",
        "manager": "Управление экскурсиями, маршрутами и точками интереса",
        "accountant": "Контроль оплат и mock-счетов",
        "guide": "Экскурсовод и маршрутные задания",
        "admin": "Администратор системы",
        "superuser": "Полный технический доступ",
    }
    existing_role_names = {name for (name,) in db.query(Role.name).all()}
    for role_name, description in role_descriptions.items():
        if role_name not in existing_role_names:
            db.add(Role(name=role_name, description=description))
    db.flush()
    roles_by_name = {role.name: role for role in db.query(Role).all()}
    existing_user_role_pairs = {
        (user_id, role_id) for user_id, role_id in db.query(UserRoleLink.user_id, UserRoleLink.role_id).all()
    }
    for user in db.query(User).all():
        role = roles_by_name.get(user.role.value)
        if role and (user.id, role.id) not in existing_user_role_pairs:
            db.add(UserRoleLink(user_id=user.id, role_id=role.id))

    existing_codes = {code for (code,) in db.query(Rule.code).all()}
    rules = [
        Rule(
            associated_role=UserRole.manager,
            code=ROUTE_MANAGE,
            title="Управление маршрутами",
            description="Создание и редактирование маршрутов, дат и фотографий.",
            error_message="Недостаточно прав для управления маршрутами",
        ),
        Rule(
            associated_role=UserRole.manager,
            code=POINTS_MANAGE,
            title="Управление точками интереса",
            description="CRUD категорий и точек интереса, импорт из OSM.",
            error_message="Недостаточно прав для управления точками интереса",
        ),
        Rule(
            associated_role=UserRole.manager,
            code=EXCURSIONS_MANAGE,
            title="Управление экскурсиями",
            description="Создание программ, привязка маршрутов и управление сеансами.",
            error_message="Недостаточно прав для управления экскурсиями",
        ),
        Rule(
            associated_role=UserRole.dispatcher,
            code=BOOKING_MANAGE,
            title="Управление заявками",
            description="Просмотр и обработка заявок клиентов.",
            error_message="Недостаточно прав для управления заявками",
        ),
        Rule(
            associated_role=UserRole.accountant,
            code=PAYMENTS_MANAGE,
            title="Управление оплатами",
            description="Просмотр заявок к оплате и изменение платежного статуса.",
            error_message="Недостаточно прав для управления оплатами",
        ),
        Rule(
            associated_role=UserRole.guide,
            code=GUIDE_ASSIGNMENTS_VIEW,
            title="Маршрутные задания экскурсовода",
            description="Просмотр назначенных сеансов и маршрутных заданий.",
            error_message="Недостаточно прав для просмотра маршрутных заданий",
        ),
        Rule(
            associated_role=UserRole.manager,
            code=REVIEWS_MODERATE,
            title="Модерация отзывов",
            description="Публикация и скрытие отзывов после экскурсии.",
            error_message="Недостаточно прав для модерации отзывов",
        ),
        Rule(
            associated_role=UserRole.manager,
            code=TARIFFS_MANAGE,
            title="Управление тарифами",
            description="Создание и редактирование тарифов для экскурсий.",
            error_message="Недостаточно прав для управления тарифами",
        ),
        Rule(
            associated_role=UserRole.admin,
            code=USERS_MANAGE,
            title="Управление пользователями",
            description="Создание сотрудников и изменение их ролей.",
            error_message="Недостаточно прав для управления пользователями",
        ),
        Rule(
            associated_role=UserRole.admin,
            code=RULES_MANAGE,
            title="Управление правами",
            description="Настройка правил доступа и выдача прав пользователям.",
            error_message="Недостаточно прав для управления правами",
        ),
        Rule(
            associated_role=UserRole.admin,
            code=INTEGRATIONS_MANAGE,
            title="Настройки интеграций",
            description="Проверка OSRM, Overpass и LLM-интеграций.",
            error_message="Недостаточно прав для настройки интеграций",
        ),
    ]
    pending_rules = [rule for rule in rules if rule.code not in existing_codes]
    if pending_rules:
        db.add_all(pending_rules)
        db.flush()
    for user in db.query(User).all():
        sync_user_rules(db, user)

    tariffs = db.query(Tariff).all()
    if not tariffs:
        tariffs = [
            Tariff(
                title="Семейный тариф",
                description="Скидка для семейных посещений.",
                multiplier=0.9,
            ),
            Tariff(
                title="Студенческий тариф",
                description="Скидка при предъявлении студенческого.",
                multiplier=0.85,
            ),
            Tariff(
                title="Премиум",
                description="Персональное сопровождение и дополнительное время.",
                multiplier=1.3,
            ),
        ]
        db.add_all(tariffs)
        db.flush()

    category_specs = [
        ("музей", "Музеи и выставочные пространства"),
        ("памятник", "Монументы, мемориалы и исторические объекты"),
        ("парк", "Парки, сады и прогулочные зоны"),
        ("театр", "Театры и культурные площадки"),
        ("храм", "Культовые сооружения"),
        ("обзорная площадка", "Панорамные точки маршрутов"),
        ("арт-объект", "Фонтаны, скульптуры и городское искусство"),
    ]
    categories = {category.name: category for category in db.query(PointCategory).all()}
    for name, description in category_specs:
        if name not in categories:
            category = PointCategory(name=name, description=description)
            db.add(category)
            db.flush()
            categories[name] = category

    poi_specs = [
        ("Памятник Салавату Юлаеву", "памятник", 54.7184771, 55.9258453, "Панорамный символ Уфы над рекой Белой."),
        ("Конгресс-холл Торатау", "обзорная площадка", 54.7220000, 55.9270000, "Культурно-деловой комплекс рядом с набережной."),
        ("Сад имени Салавата Юлаева", "парк", 54.7126400, 55.9522230, "Исторический сад на высоком берегу Белой."),
        ("Софьюшкина аллея", "парк", 54.7164750, 55.9460400, "Прогулочная аллея в исторической части города."),
        ("Аксаковский сад", "парк", 54.7200810, 55.9522370, "Один из старейших городских садов Уфы."),
        ("Башкирский государственный театр оперы и балета", "театр", 54.7225891, 55.9444937, "Главная оперная сцена республики."),
        ("Памятник Федору Шаляпину", "памятник", 54.7223600, 55.9458980, "Городской памятник певцу рядом с театральным кварталом."),
        ("Гостиный двор", "памятник", 54.7249825, 55.9441737, "Исторический торговый комплекс в центре Уфы."),
        ("Фонтан Семь девушек", "арт-объект", 54.7235400, 55.9451800, "Скульптурная композиция на Театральной площади."),
        ("Монумент Дружбы", "памятник", 54.7108518, 55.9629509, "Монумент на высоком берегу Белой."),
        ("Национальный музей Республики Башкортостан", "музей", 54.7199636, 55.9502233, "Экспозиции о природе, культуре и истории Башкортостана."),
        ("Парк имени Ивана Якутова", "парк", 54.7403639, 55.9505441, "Городской парк с прогулочными аллеями и озером."),
        ("Парк Победы", "парк", 54.8232253, 56.0570749, "Мемориальный парк с панорамными видами."),
    ]
    existing_poi = {name for (name,) in db.query(PointOfInterest.name).all()}
    for name, category_name, lat, lon, description in poi_specs:
        if name in existing_poi:
            continue
        db.add(
            PointOfInterest(
                category_id=categories[category_name].id,
                name=name,
                short_description=description,
                full_description=description,
                lat=lat,
                lon=lon,
                active=True,
                source="seed:ufa",
            )
        )
    db.flush()

    if db.query(Route).first():
        if not db.query(Excursion).first():
            _seed_excursions_from_routes(db)
        db.commit()
        return

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
    route1.tariffs = [tariffs[0], tariffs[1]]

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
    route2.tariffs = [tariffs[0], tariffs[2]]

    db.add_all([route1, route2])
    db.flush()

    today = date.today()
    route_dates = [
        RouteDate(
            route_id=route1.id,
            guide_id=guide1.id,
            date=today + timedelta(days=5),
            starts_at=datetime.combine(today + timedelta(days=5), datetime.min.time()),
        ),
        RouteDate(
            route_id=route1.id,
            guide_id=guide2.id,
            date=today + timedelta(days=7),
            starts_at=datetime.combine(today + timedelta(days=7), datetime.min.time()),
        ),
        RouteDate(
            route_id=route1.id,
            guide_id=guide1.id,
            date=today + timedelta(days=9),
            starts_at=datetime.combine(today + timedelta(days=9), datetime.min.time()),
        ),
        RouteDate(
            route_id=route1.id,
            guide_id=guide2.id,
            date=today + timedelta(days=14),
            starts_at=datetime.combine(today + timedelta(days=14), datetime.min.time()),
        ),
        RouteDate(
            route_id=route2.id,
            guide_id=guide1.id,
            date=today + timedelta(days=10),
            starts_at=datetime.combine(today + timedelta(days=10), datetime.min.time()),
        ),
        RouteDate(
            route_id=route2.id,
            guide_id=guide2.id,
            date=today + timedelta(days=12),
            starts_at=datetime.combine(today + timedelta(days=12), datetime.min.time()),
        ),
        RouteDate(
            route_id=route2.id,
            guide_id=guide1.id,
            date=today + timedelta(days=16),
            starts_at=datetime.combine(today + timedelta(days=16), datetime.min.time()),
        ),
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
    _seed_excursions_from_routes(db)
    db.commit()
