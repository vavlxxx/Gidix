from pydantic import Field

from src.schemas.base import BaseDTO, TimingDTO
from src.schemas.product import ProductDTO


class CategoryUpdateDTO(BaseDTO):
    title: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, min_length=1, max_length=5000)


class CategoryAddDTO(BaseDTO):
    title: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, min_length=1, max_length=5000)


class CategoryDTO(CategoryAddDTO, TimingDTO):
    id: int = Field(..., gt=0)


class CategoryWithProductsDTO(CategoryDTO):
    products: list[ProductDTO]
