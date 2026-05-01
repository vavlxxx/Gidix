import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.db import SessionLocal, engine
from app.models import Base, Booking, User
from app.routers import auth, bookings, excursions, guide, integrations, points, routes, rules, tariffs, uploads, users
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
app.include_router(points.router)
app.include_router(excursions.router)
app.include_router(bookings.router)
app.include_router(guide.router)
app.include_router(users.router)
app.include_router(rules.router)
app.include_router(tariffs.router)
app.include_router(uploads.router)
app.include_router(integrations.router)

app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.on_event("startup")
def on_startup() -> None:
    os.makedirs(settings.media_dir, exist_ok=True)
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            conn.execute(text("ALTER TABLE points ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)"))
            conn.execute(
                text(
                    "UPDATE points SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326) WHERE geom IS NULL"
                )
            )
            conn.execute(text("ALTER TABLE route_dates ADD COLUMN IF NOT EXISTS starts_at timestamp"))
            conn.execute(text("UPDATE route_dates SET starts_at = date::timestamp WHERE starts_at IS NULL"))
            conn.execute(text("ALTER TABLE route_dates ADD COLUMN IF NOT EXISTS guide_id integer"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS route_date_id integer"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_approved boolean"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar(100)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar(100)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name varchar(100)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(50)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar(200)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean DEFAULT true"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp"))
            conn.execute(text("UPDATE users SET active = is_active WHERE active IS NULL"))
            conn.execute(text("UPDATE users SET password_hash = hashed_password WHERE password_hash IS NULL"))
            conn.execute(text("UPDATE users SET updated_at = created_at WHERE updated_at IS NULL"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS name varchar(200)"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS estimated_duration_min integer"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS estimated_length_km double precision"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS active boolean DEFAULT true"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS formation_type varchar(32) DEFAULT 'manual'"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS geometry_geojson jsonb"))
            conn.execute(text("UPDATE routes SET name = title WHERE name IS NULL"))
            conn.execute(text("UPDATE routes SET estimated_duration_min = ROUND(duration_hours * 60) WHERE estimated_duration_min IS NULL"))
            conn.execute(text("UPDATE routes SET active = is_published WHERE active IS NULL"))
            conn.execute(
                text(
                    "UPDATE routes SET formation_type = 'manual'::formationtype "
                    "WHERE formation_type IS NULL"
                )
            )
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session_id integer"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id integer"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_phone varchar(50)"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_email varchar(200)"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS participants_count integer"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_status varchar(32) DEFAULT 'new'"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status varchar(32) DEFAULT 'not_required'"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamp"))
            conn.execute(text("UPDATE bookings SET client_phone = phone WHERE client_phone IS NULL"))
            conn.execute(text("UPDATE bookings SET client_email = email WHERE client_email IS NULL"))
            conn.execute(text("UPDATE bookings SET participants_count = participants WHERE participants_count IS NULL"))
            conn.execute(text("UPDATE bookings SET booking_status = status WHERE booking_status IS NULL"))
            conn.execute(
                text(
                    "UPDATE bookings SET payment_status = 'not_required'::paymentstatus "
                    "WHERE payment_status IS NULL"
                )
            )
            conn.execute(text("UPDATE bookings SET updated_at = created_at WHERE updated_at IS NULL"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_text text"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status varchar(32) DEFAULT 'pending'"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS show_on_site boolean DEFAULT false"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at timestamp"))
            conn.execute(text("UPDATE reviews SET review_text = comment WHERE review_text IS NULL"))
            conn.execute(
                text(
                    """
                    UPDATE reviews
                    SET moderation_status = (
                        CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
                    )::moderationstatus
                    WHERE moderation_status IS NULL
                    """
                )
            )
            conn.execute(text("UPDATE reviews SET show_on_site = is_approved WHERE show_on_site IS NULL"))
            conn.execute(text("UPDATE reviews SET updated_at = created_at WHERE updated_at IS NULL"))
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
            conn.execute(text("ALTER TABLE points ADD COLUMN IF NOT EXISTS geom TEXT"))
            conn.execute(text("ALTER TABLE route_dates ADD COLUMN IF NOT EXISTS starts_at DATETIME"))
            conn.execute(text("UPDATE route_dates SET starts_at = date WHERE starts_at IS NULL"))
            conn.execute(text("ALTER TABLE route_dates ADD COLUMN IF NOT EXISTS guide_id INTEGER"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS route_date_id INTEGER"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_approved INTEGER"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 1"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at DATETIME"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at DATETIME"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS name TEXT"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS estimated_duration_min INTEGER"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS estimated_length_km REAL"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 1"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS formation_type TEXT DEFAULT 'manual'"))
            conn.execute(text("ALTER TABLE routes ADD COLUMN IF NOT EXISTS geometry_geojson JSON"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session_id INTEGER"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_phone TEXT"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_email TEXT"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS participants_count INTEGER"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'new'"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_required'"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at DATETIME"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_text TEXT"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending'"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS show_on_site INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at DATETIME"))
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
            conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'checking'"))
            conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'approved'"))
            conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'rejected'"))
            conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS 'cancelled'"))
            role_enum = User.__table__.c.role.type.name
            conn.execute(text(f"ALTER TYPE {role_enum} ADD VALUE IF NOT EXISTS 'superuser'"))
            conn.execute(text(f"ALTER TYPE {role_enum} ADD VALUE IF NOT EXISTS 'guide'"))
            conn.execute(text(f"ALTER TYPE {role_enum} ADD VALUE IF NOT EXISTS 'client'"))
            conn.execute(text(f"ALTER TYPE {role_enum} ADD VALUE IF NOT EXISTS 'dispatcher'"))
            conn.execute(text(f"ALTER TYPE {role_enum} ADD VALUE IF NOT EXISTS 'accountant'"))
    with SessionLocal() as db:
        seed_if_needed(db)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
