from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base
from src.models.category import Category


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, sort_order=-1)
    title: Mapped[str] = mapped_column(String(length=200), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float]
    quantity: Mapped[int] = mapped_column(Integer(), default=0)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey(f"{Category.__tablename__}.id"))

    __table_args__ = (
        CheckConstraint("price >= 0", name="price_positive"),
        CheckConstraint("quantity >= 0", name="quantity_positive"),
        CheckConstraint("length(title) > 0", name="title_length_positive"),
    )
