"""routes

Revision ID: a10000000001
Revises: 2094603e316e
Create Date: 2026-05-01 16:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a10000000001"
down_revision: Union[str, Sequence[str], None] = "2094603e316e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_point_id", sa.Integer(), nullable=True),
        sa.Column("finish_point_id", sa.Integer(), nullable=True),
        sa.Column("estimated_duration_min", sa.Integer(), nullable=True),
        sa.Column("estimated_length_km", sa.Numeric(10, 2), nullable=True),
        sa.Column("formation_type", sa.String(length=50), nullable=False, server_default="manual"),
        sa.Column("optimization_algorithm", sa.String(length=100), nullable=True),
        sa.Column("geometry_geojson", sa.JSON(), nullable=True),
        sa.Column("route_metadata", sa.JSON(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["finish_point_id"], ["points_of_interest.id"], name=op.f("fk_routes_finish_point_id_points_of_interest")),
        sa.ForeignKeyConstraint(["start_point_id"], ["points_of_interest.id"], name=op.f("fk_routes_start_point_id_points_of_interest")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_routes")),
    )
    op.create_index(op.f("ix_routes_title"), "routes", ["title"], unique=False)

    op.create_table(
        "route_points",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("route_id", sa.Integer(), nullable=False),
        sa.Column("point_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("visit_duration_min", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["point_id"], ["points_of_interest.id"], name=op.f("fk_route_points_point_id_points_of_interest")),
        sa.ForeignKeyConstraint(["route_id"], ["routes.id"], name=op.f("fk_route_points_route_id_routes"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_route_points")),
        sa.UniqueConstraint("route_id", "position", name="uq_route_points_route_id_position"),
    )
    op.create_index(op.f("ix_route_points_point_id"), "route_points", ["point_id"], unique=False)
    op.create_index(op.f("ix_route_points_route_id"), "route_points", ["route_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_route_points_route_id"), table_name="route_points")
    op.drop_index(op.f("ix_route_points_point_id"), table_name="route_points")
    op.drop_table("route_points")
    op.drop_index(op.f("ix_routes_title"), table_name="routes")
    op.drop_table("routes")
