import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

sys.path.append(str(Path(__file__).parent.parent))

import uvicorn
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from src.api import router as main_router
from src.api.docs import router as docs_router
from src.config import settings
from src.db import engine
from src.utils.db_tools import DBHealthChecker
from src.utils.logconfig import configurate_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger = get_logger("src")

    helper = DBHealthChecker(engine=engine)
    await helper.check()
    logger.info("All checks passed!")

    yield

    await engine.dispose()
    logger.info("Shutting down...")


configurate_logging()
app = FastAPI(
    title=settings.app.title,
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    default_response_class=ORJSONResponse,
)
app.include_router(main_router)
app.include_router(docs_router)


if __name__ == "__main__":
    uvicorn.run(
        app="main:app",
        host=settings.uvicorn.host,
        port=settings.uvicorn.port,
        reload=settings.uvicorn.reload,
        log_config="logging_config.json",
    )
