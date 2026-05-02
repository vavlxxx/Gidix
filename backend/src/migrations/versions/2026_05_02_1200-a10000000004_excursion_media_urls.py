"""excursion media urls

Revision ID: a10000000004
Revises: a10000000003
Create Date: 2026-05-02 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a10000000004"
down_revision: Union[str, None] = "a10000000003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("excursions", sa.Column("media_urls", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("excursions", "media_urls")
