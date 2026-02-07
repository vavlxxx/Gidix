import pytest
from pydantic import ValidationError

from src.schemas.product import ProductAddDTO, ProductDTO
from src.services.product import ProductService
from src.utils.db_tools import DBManager
from src.utils.exceptions import CategoryNotFoundError


async def test_add_single_product(
    db: DBManager,
    product_examples: list[ProductAddDTO],
    recreate_tables: None,
    fill_categories: None,
) -> None:
    len_before_add = len(await ProductService(db).get_products())
    result = await ProductService(db).add_product(data=product_examples[0])
    len_after_add = len(await ProductService(db).get_products())
    assert result
    assert isinstance(result, ProductDTO)
    assert len_before_add == 0 and len_after_add == 1


async def test_raises_validation_error_while_title_empty(db: DBManager) -> None:
    with pytest.raises(ValidationError):
        ProductAddDTO(
            title="",
            description="123",
            quantity=1,
            category_id=1,
            price=3.0,
        )


async def test_raises_validation_error_while_quantity_negative(db: DBManager) -> None:
    with pytest.raises(ValidationError):
        ProductAddDTO(
            title="213",
            description="123",
            quantity=-1,
            category_id=1,
            price=3.0,
        )


async def test_raises_validation_error_while_price_negative(db: DBManager) -> None:
    with pytest.raises(ValidationError):
        ProductAddDTO(
            title="12",
            description="123",
            quantity=1,
            category_id=1,
            price=-3.0,
        )


async def test_big_product_title(db: DBManager) -> None:
    with pytest.raises(ValidationError):
        ProductAddDTO(
            title="a" * 101,
            description="123",
            quantity=1,
            category_id=1,
            price=3.0,
        )


async def test_big_product_description(db: DBManager) -> None:
    with pytest.raises(ValidationError):
        ProductAddDTO(
            title="123",
            description="a" * 2**16,
            quantity=1,
            category_id=1,
            price=3.0,
        )


async def test_add_product_with_non_existing_category(db: DBManager, clear_categories: None) -> None:
    with pytest.raises(CategoryNotFoundError):
        await ProductService(db).add_product(
            data=ProductAddDTO(
                title="123",
                description="a",
                quantity=1,
                category_id=1,
                price=3.0,
            )
        )
