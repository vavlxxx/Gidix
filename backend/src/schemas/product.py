from pydantic import Field

from src.schemas.base import BaseDTO, TimingDTO


class ProductUpdateDTO(BaseDTO):
    title: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, min_length=1, max_length=5000)
    price: float | None = Field(None, ge=0)
    quantity: int | None = Field(None, ge=0)
    category_id: int | None = Field(None, ge=1)


class ProductAddDTO(BaseDTO):
    title: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, min_length=1, max_length=5000)
    price: float = Field(..., ge=0)
    quantity: int = Field(..., ge=0)
    category_id: int


class ProductDTO(ProductAddDTO, TimingDTO):
    id: int
