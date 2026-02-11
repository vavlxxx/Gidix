import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db import SessionLocal, engine
from app.models import Base
from app.routers import auth, bookings, routes, uploads, users
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
    title="Информационная система управления экскурсионными маршрутами",
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
app.include_router(uploads.router)

app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.on_event("startup")
def on_startup() -> None:
    os.makedirs(settings.media_dir, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_needed(db)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
