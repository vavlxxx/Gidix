import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.db import SessionLocal, engine
from app.models import Base, Booking, User
from app.routers import auth, bookings, routes, rules, tariffs, uploads, users
from app.seed import seed_if_needed


def setup_logging() -> None:
    os.makedirs(settings.logs_dir, exist_ok=True)
    log_path = os.path.join(settings.logs_dir, "app.log")
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        handlers=[logging.FileHandler(log_path, encoding="utf-8"), logging.StreamHandler()],
    )


setup_logging()

app = FastAPI(
    title="Gidix — управление экскурсионными маршрутами",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(routes.router)
app.include_router(bookings.router)
app.include_router(users.router)
app.include_router(rules.router)
app.include_router(tariffs.router)
app.include_router(uploads.router)

app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.on_event("startup")
def on_startup() -> None:
    os.makedirs(settings.media_dir, exist_ok=True)
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE points ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)"))
        conn.execute(
            text(
                "UPDATE points SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326) WHERE geom IS NULL"
            )
        )
        if engine.dialect.name == "postgresql":
            conn.execute(text("ALTER TABLE route_dates ADD COLUMN IF NOT EXISTS starts_at timestamp"))
            conn.execute(text("UPDATE route_dates SET starts_at = date::timestamp WHERE starts_at IS NULL"))
            conn.execute(text("ALTER TABLE route_dates ADD COLUMN IF NOT EXISTS guide_id integer"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS route_date_id integer"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_approved boolean"))
            conn.execute(
                text(
                    """
                    UPDATE reviews AS r
                    SET route_date_id = rd.id
                    FROM bookings AS b
                    JOIN route_dates AS rd ON rd.route_id = b.route_id AND rd.date = b.desired_date
                    WHERE r.route_date_id IS NULL AND r.booking_id = b.id
                    """
                )
            )
            conn.execute(text("UPDATE reviews SET is_approved = TRUE WHERE is_approved IS NULL"))
        else:
            conn.execute(text("ALTER TABLE route_dates ADD COLUMN IF NOT EXISTS starts_at DATETIME"))
            conn.execute(text("UPDATE route_dates SET starts_at = date WHERE starts_at IS NULL"))
            conn.execute(text("ALTER TABLE route_dates ADD COLUMN IF NOT EXISTS guide_id INTEGER"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS route_date_id INTEGER"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_approved INTEGER"))
            conn.execute(
                text(
                    """
                    UPDATE reviews
                    SET route_date_id = (
                        SELECT rd.id
                        FROM bookings AS b
                        JOIN route_dates AS rd ON rd.route_id = b.route_id AND rd.date = b.desired_date
                        WHERE b.id = reviews.booking_id
                    )
                    WHERE route_date_id IS NULL
                    """
                )
            )
            conn.execute(text("UPDATE reviews SET is_approved = 1 WHERE is_approved IS NULL"))
        if engine.dialect.name == "postgresql":
            enum_name = Booking.__table__.c.status.type.name
            conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'completed'"))
            role_enum = User.__table__.c.role.type.name
            conn.execute(text(f"ALTER TYPE {role_enum} ADD VALUE IF NOT EXISTS 'superuser'"))
            conn.execute(text(f"ALTER TYPE {role_enum} ADD VALUE IF NOT EXISTS 'guide'"))
    with SessionLocal() as db:
        seed_if_needed(db)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
