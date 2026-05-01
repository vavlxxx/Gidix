from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


class PrimaryKeyMixin:
    _pk_column_name: str | None = None

    @declared_attr
    def id(cls) -> Mapped[int]:
        column_name = cls._pk_column_name
        if cls._pk_column_name is None:
            class_name = cls.__class__.__name__
            column_name = f"{class_name}_id"

        return mapped_column(
            column_name,
            Integer,
            primary_key=True,
            autoincrement=True,
            sort_order=-1,
        )
