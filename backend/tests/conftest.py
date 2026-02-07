# ruff: noqa: E402

import json
from typing import AsyncGenerator

import pytest

from src.api.v1.dependencies.db import get_db_with_null_pool
from src.config import BASE_DIR, settings
from src.db import engine_null_pool
from src.models import *  # noqa: F403
from src.models.base import Base
from src.schemas.category import CategoryAddDTO, CategoryDTO
from src.schemas.product import ProductAddDTO, ProductDTO
from src.utils.db_tools import DBHealthChecker, DBManager


@pytest.fixture()
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


@pytest.fixture()
async def recreate_tables(db: DBManager) -> None:
    async with engine_null_pool.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture(scope="session", autouse=True)
async def main(check_test_mode) -> None:
    await DBHealthChecker(engine=engine_null_pool).check()

    async with engine_null_pool.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture()
def category_examples() -> list[CategoryAddDTO]:
    path = BASE_DIR / "src" / "extra" / "examples" / "category.json"
    assert path.exists()
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data is not None
    assert len(data) > 0
    examples = [CategoryAddDTO(**item) for item in data]
    assert all(isinstance(item, CategoryAddDTO) for item in examples)
    return examples


@pytest.fixture()
def product_examples() -> list[ProductAddDTO]:
    path = BASE_DIR / "src" / "extra" / "examples" / "product.json"
    assert path.exists()
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data is not None
    assert len(data) > 0
    examples = [ProductAddDTO(**item) for item in data]
    assert all(isinstance(item, ProductAddDTO) for item in examples)
    return examples


@pytest.fixture()
async def clear_products(db: DBManager) -> None:
    await db.product.delete_all()
    await db.commit()


@pytest.fixture()
async def clear_categories(db: DBManager, clear_products: None) -> None:
    await db.category.delete_all()
    await db.commit()


@pytest.fixture()
async def fill_products_and_related_categories(
    db: DBManager,
    recreate_tables: None,
    fill_categories: None,
    product_examples: list[ProductAddDTO],
) -> list[ProductDTO]:
    products = await db.product.get_all()
    assert len(products) == 0
    result = await db.product.add_bulk(product_examples)
    await db.commit()
    assert len(result) > 0 and len(result) == len(product_examples)
    return result


@pytest.fixture()
async def fill_categories(db: DBManager, category_examples: list[CategoryAddDTO], clear_categories: None) -> list[CategoryDTO]:
    categories = await db.category.get_all()
    assert len(categories) == 0
    result = await db.category.add_bulk(category_examples)
    await db.commit()
    assert len(result) > 0 and len(result) == len(category_examples)
    return result
