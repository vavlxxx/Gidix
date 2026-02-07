import pytest

from src.schemas.product import ProductDTO
from src.services.product import ProductService
from src.utils.db_tools import DBManager
from src.utils.exceptions import ProductNotFoundError, ValueOutOfRangeError


async def test_delete_category(
    db: DBManager,
    clear_products: None,
    fill_products_and_related_categories: list[ProductDTO],
) -> None:
    products = await ProductService(db).get_products()
    assert products
    result = await ProductService(db).delete_product(id=products[0].id)
    assert result
    products_after_delete = await ProductService(db).get_products()
    assert products_after_delete
    assert len(products) > len(products_after_delete)

    with pytest.raises(ProductNotFoundError):
        await ProductService(db).get_product(id=products[0].id)


async def test_raises_exc_while_big_id(db: DBManager):
    with pytest.raises(ValueOutOfRangeError):
        await ProductService(db).delete_product(id=2**32)


async def test_raises_exc_while_non_existing_id(db: DBManager):
    with pytest.raises(ProductNotFoundError):
        await ProductService(db).delete_product(id=-1)
