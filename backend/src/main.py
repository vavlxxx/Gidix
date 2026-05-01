from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

sys.path.append(str(Path(__file__).parent.parent))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api import router as main_router
from src.config import settings
from src.db import engine
from src.utils.db_tools import DBHealthChecker
from src.utils.logging import configurate_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger = get_logger("src")
    try:
        await DBHealthChecker(engine=engine).check()
        logger.info("Database schema check passed")
    except Exception as exc:
        logger.warning("Database schema check skipped or failed: %s", exc)
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    yield
    logger.info("Shutting down...")


configurate_logging()
app = FastAPI(lifespan=lifespan, title=settings.app.title)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(main_router)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        app="src.main:app",
        host=settings.uvicorn.host,
        port=settings.uvicorn.port,
        reload=settings.uvicorn.reload,
    )
