import pytest
from pydantic import ValidationError

from src.schemas.product import ProductDTO, ProductUpdateDTO
from src.services.product import ProductService
from src.utils.db_tools import DBManager
from src.utils.exceptions import ProductNotFoundError, ValueOutOfRangeError


async def test_update_product(
    db: DBManager,
    fill_products_and_related_categories: list[ProductDTO],
) -> None:
    service = ProductService(db)
    old = await service.get_product(id=fill_products_and_related_categories[0].id)
    assert old
    product = ProductUpdateDTO(
        title="213",
        description="123",
        quantity=1,
        category_id=1,
        price=3.0,
    )
    await service.update_product(id=fill_products_and_related_categories[0].id, data=product)
    new = await service.get_product(id=fill_products_and_related_categories[0].id)
    assert new
    assert new.id == old.id
    assert new != old

    assert new.title == product.title
    assert new.description == product.description
    assert new.price == product.price
    assert new.quantity == product.quantity
    assert new.category_id == product.category_id


async def test_update_only_one_field(db: DBManager, fill_products_and_related_categories: list[ProductDTO]) -> None:
    service = ProductService(db)
    old = await service.get_product(id=fill_products_and_related_categories[0].id)
    assert old

    category = ProductUpdateDTO(title="123")  # type: ignore
    await service.update_product(id=fill_products_and_related_categories[0].id, data=category)
    new = await service.get_product(id=fill_products_and_related_categories[0].id)

    assert new
    assert new.id == old.id
    assert new != old
    assert new.title != old.title and new.description == old.description

    category = ProductUpdateDTO(description="123")  # type: ignore
    await service.update_product(id=fill_products_and_related_categories[0].id, data=category)
    new = await service.get_product(id=fill_products_and_related_categories[0].id)

    assert new
    assert new.id == old.id
    assert new != old
    assert new.title != old.title and new.description != old.description


async def test_update_non_existing_product(db: DBManager) -> None:
    with pytest.raises(ProductNotFoundError):
        category = ProductUpdateDTO(
            title="213",
            description="123",
            quantity=1,
            category_id=1,
            price=3.0,
        )
        await ProductService(db).update_product(id=-1, data=category)


async def test_raises_out_of_range_err_with_big_id(db: DBManager) -> None:
    with pytest.raises(ValueOutOfRangeError):
        category = ProductUpdateDTO(
            title="213",
            description="123",
            quantity=1,
            category_id=1,
            price=3.0,
        )
        await ProductService(db).update_product(id=2**32, data=category)


async def raises_validation_errors():
    with pytest.raises(ValidationError):
        ProductUpdateDTO(
            title="",
            description="a",
            quantity=1,
            category_id=1,
            price=3.0,
        )
    with pytest.raises(ValidationError):
        ProductUpdateDTO(
            title="123",
            description="a",
            quantity=1,
            category_id=1,
            price=-3.0,
        )
    with pytest.raises(ValidationError):
        ProductUpdateDTO(
            title="123",
            description="a",
            quantity=-1,
            category_id=1,
            price=3.0,
        )
    with pytest.raises(ValidationError):
        ProductUpdateDTO(
            title="123",
            description="a" * 2**16,
            quantity=1,
            category_id=1,
            price=3.0,
        )
