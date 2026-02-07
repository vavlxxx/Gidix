import pytest

from src.schemas.product import ProductDTO
from src.services.product import ProductService
from src.utils.db_tools import DBManager
from src.utils.exceptions import ProductNotFoundError, ValueOutOfRangeError


async def test_get_correct_product_class(db: DBManager, fill_products_and_related_categories: list[ProductDTO]) -> None:
    products = await ProductService(db).get_products()
    assert products and len(fill_products_and_related_categories) == len(products)
    assert all(isinstance(item, ProductDTO) for item in products)


async def test_get_single_product_by_id(db: DBManager, fill_products_and_related_categories: list[ProductDTO]) -> None:
    product = await ProductService(db).get_product(id=fill_products_and_related_categories[0].id)
    assert product and product.id == fill_products_and_related_categories[0].id


async def test_raise_exc_while_big_id(db: DBManager, fill_products_and_related_categories: list[ProductDTO]) -> None:
    with pytest.raises(ValueOutOfRangeError):
        await ProductService(db).get_product(id=2**32)


async def test_raise_exc_by_incorrect_id(db: DBManager, fill_products_and_related_categories: list[ProductDTO]) -> None:
    with pytest.raises(ProductNotFoundError):
        await ProductService(db).get_product(id=-1)
