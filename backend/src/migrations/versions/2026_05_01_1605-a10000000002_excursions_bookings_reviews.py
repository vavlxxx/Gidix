"""excursions bookings reviews

Revision ID: a10000000002
Revises: a10000000001
Create Date: 2026-05-01 16:05:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a10000000002"
down_revision: Union[str, Sequence[str], None] = "a10000000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "excursions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("route_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("base_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("duration_min", sa.Integer(), nullable=True),
        sa.Column("image_url", sa.String(length=1000), nullable=True),
        sa.Column("meeting_point", sa.String(length=500), nullable=True),
        sa.Column("max_participants", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["route_id"], ["routes.id"], name=op.f("fk_excursions_route_id_routes")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_excursions")),
    )
    op.create_index(op.f("ix_excursions_title"), "excursions", ["title"], unique=False)

    op.create_table(
        "guide_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("excursion_id", sa.Integer(), nullable=False),
        sa.Column("guide_id", sa.Integer(), nullable=True),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="scheduled"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["excursion_id"], ["excursions.id"], name=op.f("fk_guide_sessions_excursion_id_excursions"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["guide_id"], ["users.id"], name=op.f("fk_guide_sessions_guide_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_guide_sessions")),
    )
    op.create_index(op.f("ix_guide_sessions_excursion_id"), "guide_sessions", ["excursion_id"], unique=False)

    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("excursion_id", sa.Integer(), nullable=True),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("customer_phone", sa.String(length=50), nullable=True),
        sa.Column("customer_email", sa.String(length=255), nullable=True),
        sa.Column("participants_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("total_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
        sa.Column("payment_status", sa.String(length=30), nullable=False, server_default="pending"),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["users.id"], name=op.f("fk_bookings_client_id_users")),
        sa.ForeignKeyConstraint(["excursion_id"], ["excursions.id"], name=op.f("fk_bookings_excursion_id_excursions")),
        sa.ForeignKeyConstraint(["session_id"], ["guide_sessions.id"], name=op.f("fk_bookings_session_id_guide_sessions")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bookings")),
    )

    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("excursion_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["excursion_id"], ["excursions.id"], name=op.f("fk_reviews_excursion_id_excursions"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_reviews_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reviews")),
    )
    op.create_index(op.f("ix_reviews_excursion_id"), "reviews", ["excursion_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reviews_excursion_id"), table_name="reviews")
    op.drop_table("reviews")
    op.drop_table("bookings")
    op.drop_index(op.f("ix_guide_sessions_excursion_id"), table_name="guide_sessions")
    op.drop_table("guide_sessions")
    op.drop_index(op.f("ix_excursions_title"), table_name="excursions")
    op.drop_table("excursions")
