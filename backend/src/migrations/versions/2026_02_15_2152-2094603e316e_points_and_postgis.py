"""points and postgis

Revision ID: 2094603e316e
Revises: 8093419d4e91
Create Date: 2026-02-15 21:52:26.033668
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "2094603e316e"
down_revision: Union[str, Sequence[str], None] = "8093419d4e91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "point_categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_point_categories")),
        sa.UniqueConstraint("name", name=op.f("uq_point_categories_name")),
    )
    op.create_table(
        "points_of_interest",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("short_description", sa.String(length=500), nullable=True),
        sa.Column("full_description", sa.Text(), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("visit_duration_min", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("image_url", sa.String(length=1000), nullable=True),
        sa.Column("source", sa.String(length=100), nullable=True),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("extra", sa.JSON(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["point_categories.id"], name=op.f("fk_points_of_interest_category_id_point_categories")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_points_of_interest")),
    )
    op.create_index(op.f("ix_points_of_interest_name"), "points_of_interest", ["name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_points_of_interest_name"), table_name="points_of_interest")
    op.drop_table("points_of_interest")
    op.drop_table("point_categories")
