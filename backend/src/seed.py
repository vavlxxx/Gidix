from __future__ import annotations

import asyncio
from datetime import date, time
from decimal import Decimal

from sqlalchemy import select

from src.db import sessionmaker
from src.models.auth import Role, User, UserRole
from src.models.domain import Excursion, GuideSession, PointCategory, PointOfInterest, Route, RoutePoint
from src.schemas.auth import RoleName
from src.services.auth import TokenService, ensure_roles
from src.utils.db_tools import DBManager


USERS = [
    ("admin@example.com", "admin123", "admin"),
    ("manager@example.com", "manager123", "manager"),
    ("dispatcher@example.com", "dispatcher123", "dispatcher"),
    ("accountant@example.com", "accountant123", "accountant"),
    ("guide@example.com", "guide123", "guide"),
    ("superuser@example.com", "superuser123", "superuser"),
]

POINTS = [
    ("Монумент Дружбы", "Памятник", 54.710892, 55.943981),
    ("Гостиный двор", "Архитектура", 54.724606, 55.945190),
    ("Сад имени Салавата Юлаева", "Парк", 54.720081, 55.952237),
    ("Набережная реки Белой", "Прогулка", 54.718455, 55.925766),
]


async def main() -> None:
    async with DBManager(sessionmaker) as db:
        await ensure_roles(db)
        await seed_users(db)
        await seed_points_and_excursion(db)


async def seed_users(db: DBManager) -> None:
    token_service = TokenService(db)
    for email, password, role_name in USERS:
        result = await db.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                email=email,
                username=email.split("@")[0],
                first_name=role_name.title(),
                last_name="GIDIX",
                full_name=f"GIDIX {role_name.title()}",
                password_hash=token_service.hash_pwd(password),
                active=True,
            )
            db.session.add(user)
            await db.session.flush()
        await ensure_user_role(db, user, role_name)
    await db.commit()


async def ensure_user_role(db: DBManager, user: User, role_name: str) -> None:
    role_result = await db.session.execute(select(Role).where(Role.name == role_name))
    role = role_result.scalar_one()
    link_result = await db.session.execute(select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id))
    if link_result.scalar_one_or_none() is None:
        db.session.add(UserRole(user_id=user.id, role_id=role.id))


async def seed_points_and_excursion(db: DBManager) -> None:
    categories: dict[str, PointCategory] = {}
    for _, category_name, _, _ in POINTS:
        result = await db.session.execute(select(PointCategory).where(PointCategory.name == category_name))
        category = result.scalar_one_or_none()
        if category is None:
            category = PointCategory(name=category_name)
            db.session.add(category)
            await db.session.flush()
        categories[category_name] = category

    points: list[PointOfInterest] = []
    for name, category_name, lon, lat in POINTS:
        result = await db.session.execute(select(PointOfInterest).where(PointOfInterest.name == name))
        point = result.scalar_one_or_none()
        if point is None:
            point = PointOfInterest(
                name=name,
                category_id=categories[category_name].id,
                short_description=f"Достопримечательность: {name}",
                latitude=lat,
                longitude=lon,
                visit_duration_min=20,
                image_url="https://placehold.co/600x400/EEE/31343C",
                source="seed",
            )
            db.session.add(point)
            await db.session.flush()
        points.append(point)

    result = await db.session.execute(select(Route).where(Route.title == "Прогулка по центру Уфы"))
    route = result.scalar_one_or_none()
    if route is None:
        route = Route(
            title="Прогулка по центру Уфы",
            description="Базовый маршрут по популярным точкам Уфы.",
            start_point_id=points[0].id,
            finish_point_id=points[-1].id,
            estimated_duration_min=120,
            estimated_length_km=Decimal("4.50"),
            formation_type="seed",
        )
        db.session.add(route)
        await db.session.flush()
        for position, point in enumerate(points, 1):
            db.session.add(RoutePoint(route_id=route.id, point_id=point.id, position=position, visit_duration_min=20))

    result = await db.session.execute(select(Excursion).where(Excursion.title == "Уфа: первые истории"))
    excursion = result.scalar_one_or_none()
    if excursion is None:
        excursion = Excursion(
            title="Уфа: первые истории",
            description="Короткая обзорная экскурсия по знаковым местам города.",
            route_id=route.id,
            base_price=Decimal("1200.00"),
            duration_min=120,
            image_url="https://placehold.co/600x400/EEE/31343C",
            meeting_point="Монумент Дружбы",
            max_participants=20,
        )
        db.session.add(excursion)
        await db.session.flush()
        db.session.add(GuideSession(excursion_id=excursion.id, session_date=date.today(), start_time=time(12, 0), capacity=20))

    await db.commit()


if __name__ == "__main__":
    asyncio.run(main())
