from src.schemas.product import ProductAddDTO, ProductDTO, ProductUpdateDTO
from src.services.base import BaseService
from src.utils.exceptions import (
    CategoryNotFoundError,
    ObjectAlreadyExistsError,
    ObjectInvalidValueError,
    ObjectNotFoundError,
    ProductAlreadyExistsError,
    ProductInvalidValueError,
    ProductNotFoundError,
)


class ProductService(BaseService):
    async def get_products(self) -> list[ProductDTO]:
        return await self.db.product.get_all_filtered()

    async def get_product(self, id: int) -> ProductDTO:
        result = await self.db.product.get_all_filtered(id=id)
        if not result:
            raise ProductNotFoundError
        return result[0]

    async def add_product(self, data: ProductAddDTO) -> ProductDTO:
        try:
            return await self.db.product.add(data)
        except ObjectAlreadyExistsError as exc:
            raise ProductAlreadyExistsError from exc
        except ObjectInvalidValueError as exc:
            raise ProductInvalidValueError from exc
        except ObjectNotFoundError as exc:
            raise CategoryNotFoundError from exc

    async def add_products(self, data: list[ProductAddDTO]) -> list[ProductDTO]:
        try:
            return await self.db.product.add_bulk(data)
        except ObjectAlreadyExistsError as exc:
            raise ProductAlreadyExistsError from exc
        except ObjectInvalidValueError as exc:
            raise ProductInvalidValueError from exc

    async def update_product(self, id: int, data: ProductUpdateDTO) -> ProductDTO:
        try:
            await self.db.product.edit(id=id, data=data)  # type: ignore
            return await self.db.product.get_one(id=id)
        except ObjectNotFoundError as exc:
            raise ProductNotFoundError from exc
        except ObjectAlreadyExistsError as exc:
            raise ProductAlreadyExistsError from exc
        except ObjectInvalidValueError as exc:
            raise ProductInvalidValueError from exc

    async def get_products_by_category(self, id: int) -> list[ProductDTO]:
        category = await self.db.category.get_all_filtered(id=id)
        return category[0].products

    async def delete_product(self, id: int) -> bool:
        try:
            return await self.db.product.delete(id=id)
        except ObjectNotFoundError as exc:
            raise ProductNotFoundError from exc
