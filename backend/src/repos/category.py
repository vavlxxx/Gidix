from asyncpg import DataError
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError

from src.models.category import Category
from src.repos.base import BaseRepo
from src.repos.mappers.mappers import CategoryMapper
from src.schemas.category import CategoryAddDTO, CategoryDTO, CategoryUpdateDTO, CategoryWithProductsDTO
from src.utils.exceptions import ValueOutOfRangeError


class CategoryRepo(BaseRepo[Category, CategoryDTO, CategoryAddDTO, CategoryUpdateDTO]):
    model = Category
    schema = CategoryDTO
    mapper = CategoryMapper

    async def get_all_filtered(self, *filter, **filter_by) -> list[CategoryWithProductsDTO]:  # type: ignore
        query = select(self.model).filter(*filter).filter_by(**filter_by).order_by(self.model.id)  # type: ignore
        try:
            result = await self.session.execute(query)
        except DBAPIError as exc:
            if exc.orig and isinstance(exc.orig.__cause__, DataError):
                raise ValueOutOfRangeError(detail=exc.orig.__cause__.args[0]) from exc
            raise exc
        return [CategoryWithProductsDTO.model_validate(item) for item in result.scalars().all()]
