from typing import Generic, TypeVar

# from sqlalchemy import Row, RowMapping
from src.models.base import Base
from src.schemas.base import BaseDTO

ModelType = TypeVar("ModelType", bound=Base)
SchemaReturnType = TypeVar("SchemaReturnType", bound=BaseDTO)
SchemaUpdateType = TypeVar("SchemaUpdateType", bound=BaseDTO)
SchemaAddType = TypeVar("SchemaAddType", bound=BaseDTO)


class DataMapper(Generic[ModelType, SchemaReturnType]):
    model: type[ModelType]
    schema: type[SchemaReturnType]

    @classmethod
    def map_to_domain_entity(cls, db_model: ModelType) -> SchemaReturnType:
        return cls.schema.model_validate(db_model)

    @classmethod
    def map_to_persistence_entity(cls, schema: SchemaReturnType) -> ModelType:
        return cls.model(**schema.model_dump())
