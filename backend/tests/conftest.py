# ruff: noqa: E402

from typing import Any, AsyncGenerator
from urllib.parse import urljoin

import pytest
from httpx import ASGITransport, AsyncClient

from src.api.v1.dependencies.db import get_db, get_db_with_null_pool
from src.config import settings
from src.db import engine_null_pool
from src.main import app
from src.models import *  # noqa: F403
from src.models.base import Base
from src.utils.db_tools import DBHealthChecker, DBManager

app.dependency_overrides[get_db] = get_db_with_null_pool


@pytest.fixture
async def db() -> AsyncGenerator[DBManager, None]:
    async for db in get_db_with_null_pool():
        yield db


@pytest.fixture(scope="module")
async def db_module() -> AsyncGenerator[DBManager, None]:
    async for db in get_db_with_null_pool():
        yield db


@pytest.fixture(scope="session", autouse=True)
async def check_test_mode() -> None:
    assert settings.app.mode == "TEST"
    assert settings.db.name == settings.db.name_test


@pytest.fixture
async def recreate_db() -> None:
    async with engine_null_pool.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture
async def clean_toknes(db: DBManager) -> None:
    await db.tokens.delete_all()
    await db.commit()


@pytest.fixture
async def clean_users(db: DBManager, clean_toknes: None) -> None:
    await db.auth.delete_all()
    await db.commit()


@pytest.fixture(scope="session", autouse=True)
async def async_main() -> None:
    await DBHealthChecker(engine=engine_null_pool).check()
    async with engine_null_pool.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture(scope="session")
async def ac() -> AsyncGenerator[AsyncClient, Any]:
    app_ = ASGITransport(app=app)
    host = f"http://{settings.uvicorn.host}:{settings.uvicorn.port}"
    api_meta = f"{settings.app.api_prefix}{settings.app.v1_prefix}"
    url = urljoin(host, api_meta)
    async with AsyncClient(
        transport=app_,
        base_url=url,
    ) as ac:
        yield ac


@pytest.fixture(scope="session")
async def authenticated_ac(ac: AsyncClient) -> AsyncGenerator[AsyncClient, None]:
    username = password = "admin123456"
    resp_register = await ac.post("/auth/register/", json={"username": username, "password": password})
    assert resp_register
    assert resp_register.status_code == 200

    resp_login = await ac.post("/auth/login/", json={"username": username, "password": password})
    assert resp_login
    assert resp_login.status_code == 200

    data = resp_login.json()
    assert data
    assert data.get("access_token", False)

    access_token = data["access_token"]
    ac.headers["Authorization"] = f"Bearer {access_token}"
    yield ac
