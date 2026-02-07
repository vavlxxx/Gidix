from src.models.category import Category
from src.models.product import Product
from src.repos.mappers.base import DataMapper
from src.schemas.category import CategoryDTO
from src.schemas.product import ProductDTO


class CategoryMapper(DataMapper[Category, CategoryDTO]):
    model = Category
    schema = CategoryDTO


class ProductMapper(DataMapper[Product, ProductDTO]):
    model = Product
    schema = ProductDTO
