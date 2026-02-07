from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.product import Product


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    title: Mapped[str] = mapped_column(String(length=100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    products: Mapped[list["Product"]] = relationship(
        argument="Product",
        lazy="selectin",
    )

    __table_args__ = (CheckConstraint("length(title) > 0", name="title_length_positive"),)
