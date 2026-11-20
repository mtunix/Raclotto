"""add the ingredient of the hour

Users gain ``add_ingredient_of_the_hour`` and pans ``ingredient_of_the_hour``. Like the first
revision, it leaves columns alone that an unstamped database built by create_all already has.

Revision ID: 6c1f0a7d2e94
Revises: 085bd0fc56df
Create Date: 2026-11-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "6c1f0a7d2e94"
down_revision: str | None = "085bd0fc56df"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _columns(table: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    if "add_ingredient_of_the_hour" not in _columns("user"):
        op.add_column(
            "user", sa.Column("add_ingredient_of_the_hour", sa.Boolean(), nullable=False, server_default=sa.false())
        )
    if "ingredient_of_the_hour" not in _columns("pan"):
        op.add_column(
            "pan", sa.Column("ingredient_of_the_hour", sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade() -> None:
    with op.batch_alter_table("pan") as batch:
        batch.drop_column("ingredient_of_the_hour")
    with op.batch_alter_table("user") as batch:
        batch.drop_column("add_ingredient_of_the_hour")
