from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import (
    DeclarativeBase,
    class_mapper,
)

from src.config import settings
from src.models.mixins.timing import TimingMixin


class Base(AsyncAttrs, DeclarativeBase, TimingMixin):
    __abstract__ = True
    __mapper_args__ = {
        "eager_defaults": True,
    }

    metadata = MetaData(
        naming_convention=settings.db.naming_convention,
    )
    repr_exclude_cols = (
        "created_at",
        "updated_at",
    )

    def to_dict(self) -> dict:
        columns = class_mapper(self.__class__).columns
        return {column.key: getattr(self, column.key) for column in columns}

    def __repr__(self):
        cols = []
        for k, v in self.to_dict().items():
            if k not in self.repr_exclude_cols:
                cols.append(f"{k}={v!r}")

        return f"{self.__class__.__name__}({', '.join(cols)})"
