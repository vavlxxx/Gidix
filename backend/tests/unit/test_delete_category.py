import pytest

from src.schemas.category import CategoryDTO
from src.services.category import CategoryService
from src.utils.db_tools import DBManager
from src.utils.exceptions import CategoryNotFoundError, RelatedProductsExistsError, ValueOutOfRangeError


async def test_delete_category(db: DBManager, clear_products: None, fill_categories: list[CategoryDTO]) -> None:
    categories = await CategoryService(db).get_categories()
    assert categories
    result = await CategoryService(db).delete_category(id=categories[0].id)
    assert result
    categories_after_delete = await CategoryService(db).get_categories()
    assert categories_after_delete
    assert len(categories) > len(categories_after_delete)

    with pytest.raises(CategoryNotFoundError):
        await CategoryService(db).get_category(id=categories[0].id)


async def test_raises_exc_while_big_id(db: DBManager):
    with pytest.raises(ValueOutOfRangeError):
        await CategoryService(db).delete_category(id=2**32)


async def test_raises_exc_while_non_existing_id(db: DBManager):
    with pytest.raises(CategoryNotFoundError):
        await CategoryService(db).delete_category(id=-1)


async def test_raises_exc_while_related_products_exists(
    db: DBManager, fill_products_and_related_categories: list[CategoryDTO]
) -> None:
    categories = fill_products_and_related_categories
    with pytest.raises(RelatedProductsExistsError):
        await CategoryService(db).delete_category(id=categories[0].id)
