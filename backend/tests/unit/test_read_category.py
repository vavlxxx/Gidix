import pytest

from src.schemas.category import CategoryDTO, CategoryWithProductsDTO
from src.schemas.product import ProductDTO
from src.services.category import CategoryService
from src.utils.db_tools import DBManager
from src.utils.exceptions import CategoryNotFoundError, ValueOutOfRangeError


async def test_return_correct_class(db: DBManager, fill_categories: list[CategoryDTO]) -> None:
    categories = await CategoryService(db).get_categories()
    assert categories and len(categories) == len(fill_categories)
    assert all(isinstance(item, CategoryWithProductsDTO) for item in categories)


async def test_get_single_category_by_id(db: DBManager, fill_categories: list[CategoryDTO]) -> None:
    category = await CategoryService(db).get_category(id=fill_categories[0].id)
    assert category and category.id == fill_categories[0].id


async def test_raise_exc_by_incorrect_id(db: DBManager, fill_categories: list[CategoryDTO]) -> None:
    with pytest.raises(CategoryNotFoundError):
        await CategoryService(db).get_category(id=-1)


async def test_raise_exc_while_big_id(db: DBManager, fill_categories: list[CategoryDTO]) -> None:
    with pytest.raises(ValueOutOfRangeError):
        await CategoryService(db).get_category(id=2**32)


async def test_get_related_products(db: DBManager, fill_products_and_related_categories: list[CategoryDTO]) -> None:
    category: list[CategoryWithProductsDTO] = await CategoryService(db).get_categories()
    assert category
    assert category[0].products
    assert all(isinstance(item, ProductDTO) for item in category[0].products)
    assert all(item.category_id == category[0].id for item in category[0].products)
