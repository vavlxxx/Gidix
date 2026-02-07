import pytest
from pydantic import ValidationError

from src.schemas.category import CategoryAddDTO, CategoryDTO
from src.services.category import CategoryService
from src.utils.db_tools import DBManager
from src.utils.exceptions import ObjectAlreadyExistsError


async def test_add_single_category(
    db: DBManager,
    category_examples: list[CategoryAddDTO],
    clear_categories: None,
) -> None:
    len_before_add = len(await CategoryService(db).get_categories())
    result = await CategoryService(db).add_category(data=category_examples[0])
    len_after_add = len(await CategoryService(db).get_categories())
    assert result
    assert isinstance(result, CategoryDTO)
    assert len_before_add == 0 and len_after_add == 1


async def test_raises_value_err_with_small_string(db: DBManager) -> None:
    with pytest.raises(ValidationError):
        category = CategoryAddDTO(title="", description="")
        await CategoryService(db).add_category(data=category)


async def test_big_category_title(db: DBManager) -> None:
    with pytest.raises(ValidationError):
        category = CategoryAddDTO(title="a" * 101, description="")
        await CategoryService(db).add_category(data=category)


async def test_big_category_description(db: DBManager) -> None:
    with pytest.raises(ValidationError):
        category = CategoryAddDTO(title="123", description="a" * 2**16)
        await CategoryService(db).add_category(data=category)


async def test_add_existing_category(db: DBManager, fill_categories: list[CategoryDTO]) -> None:
    with pytest.raises(ObjectAlreadyExistsError):
        await CategoryService(db).add_category(data=fill_categories[0])
