import pytest
from pydantic import ValidationError

from src.schemas.category import CategoryDTO, CategoryUpdateDTO
from src.services.category import CategoryService
from src.utils.db_tools import DBManager
from src.utils.exceptions import CategoryAlreadyExistsError, CategoryNotFoundError, ValueOutOfRangeError


async def test_update_category(
    db: DBManager,
    fill_categories: list[CategoryDTO],
) -> None:
    service = CategoryService(db)
    old = await service.get_category(id=fill_categories[0].id)
    assert old
    category = CategoryUpdateDTO(title="123", description="123")
    await service.update_category(id=fill_categories[0].id, data=category)
    new = await service.get_category(id=fill_categories[0].id)
    assert new
    assert new.id == old.id
    assert new != old
    assert new.title == category.title
    assert new.description == category.description


async def test_update_only_one_field(db: DBManager, fill_categories: list[CategoryDTO]) -> None:
    service = CategoryService(db)
    old = await service.get_category(id=fill_categories[0].id)
    assert old

    category = CategoryUpdateDTO(title="123")  # type: ignore
    await service.update_category(id=fill_categories[0].id, data=category)
    new = await service.get_category(id=fill_categories[0].id)

    assert new
    assert new.id == old.id
    assert new != old
    assert new.title != old.title and new.description == old.description

    category = CategoryUpdateDTO(description="123")  # type: ignore
    await service.update_category(id=fill_categories[0].id, data=category)
    new = await service.get_category(id=fill_categories[0].id)

    assert new
    assert new.id == old.id
    assert new != old
    assert new.title != old.title and new.description != old.description


async def test_update_non_existing_category(db: DBManager, fill_categories: list[CategoryDTO]) -> None:
    with pytest.raises(CategoryNotFoundError):
        category = CategoryUpdateDTO(title="123", description="123")
        await CategoryService(db).update_category(id=-1, data=category)


async def test_update_to_existing_category(db: DBManager, fill_categories: list[CategoryDTO]) -> None:
    with pytest.raises(CategoryAlreadyExistsError):
        category = CategoryUpdateDTO(title=fill_categories[0].title, description=None)
        await CategoryService(db).update_category(id=fill_categories[3].id, data=category)


async def test_raises_out_of_range_err_with_big_id(db: DBManager) -> None:
    with pytest.raises(ValueOutOfRangeError):
        category = CategoryUpdateDTO(title="12", description="12")
        await CategoryService(db).update_category(id=2**32, data=category)


async def raises_validation_errors():
    with pytest.raises(ValidationError):
        CategoryUpdateDTO(title="", description="12")
    with pytest.raises(ValidationError):
        CategoryUpdateDTO(title="", description="1" * 5001)
