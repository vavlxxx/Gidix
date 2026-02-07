from src.schemas.category import CategoryAddDTO, CategoryDTO, CategoryUpdateDTO, CategoryWithProductsDTO
from src.services.base import BaseService
from src.services.product import ProductService
from src.utils.exceptions import (
    CategoryAlreadyExistsError,
    CategoryInvalidValueError,
    CategoryNotFoundError,
    ObjectAlreadyExistsError,
    ObjectInvalidValueError,
    ObjectNotFoundError,
    RelatedObjectExistsError,
    RelatedProductsExistsError,
)


class CategoryService(BaseService):
    async def get_categories(self) -> list[CategoryWithProductsDTO]:
        return await self.db.category.get_all()  # type: ignore

    async def get_category(self, id: int) -> CategoryWithProductsDTO:
        result = await self.db.category.get_all_filtered(id=id)
        if not result:
            raise CategoryNotFoundError
        return result[0]

    async def add_category(self, data: CategoryAddDTO) -> CategoryDTO:
        try:
            return await self.db.category.add(data)
        except ObjectAlreadyExistsError as exc:
            raise CategoryAlreadyExistsError from exc
        except ObjectInvalidValueError as exc:
            raise CategoryInvalidValueError from exc

    async def add_categories(self, data: list[CategoryAddDTO]) -> list[CategoryDTO]:
        try:
            return await self.db.category.add_bulk(data)
        except ObjectAlreadyExistsError as exc:
            raise CategoryAlreadyExistsError from exc
        except ObjectInvalidValueError as exc:
            raise CategoryInvalidValueError from exc

    async def update_category(self, id: int, data: CategoryUpdateDTO) -> CategoryDTO:
        try:
            await self.db.category.edit(id=id, data=data)  # type: ignore
            return await self.db.category.get_one(id=id)
        except ObjectNotFoundError as exc:
            raise CategoryNotFoundError from exc
        except ObjectAlreadyExistsError as exc:
            raise CategoryAlreadyExistsError from exc
        except ObjectInvalidValueError as exc:
            raise CategoryInvalidValueError from exc

    async def delete_category(self, id: int) -> bool:
        try:
            await self.get_category(id=id)
            products = await ProductService(self.db).get_products_by_category(id=id)
            if products:
                raise RelatedProductsExistsError
            return await self.db.category.delete(id=id, ensure_existence=False)
        except RelatedObjectExistsError as exc:
            raise RelatedProductsExistsError from exc
        except ObjectNotFoundError as exc:
            raise CategoryNotFoundError from exc
