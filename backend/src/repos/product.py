from src.models.product import Product
from src.repos.base import BaseRepo
from src.repos.mappers.mappers import ProductMapper
from src.schemas.product import ProductAddDTO, ProductDTO, ProductUpdateDTO


class ProductRepo(BaseRepo[Product, ProductDTO, ProductAddDTO, ProductUpdateDTO]):
    model = Product
    schema = ProductDTO
    mapper = ProductMapper
