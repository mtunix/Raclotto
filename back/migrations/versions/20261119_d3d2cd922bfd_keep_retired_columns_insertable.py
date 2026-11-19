"""keep retired columns insertable

``pan.snacked`` and ``achievement.is_global`` left the models but stay in the database, NOT NULL
as create_all built them. The models no longer set them, so they get server defaults (the values
the models used to fill in) and inserts keep working. Nothing is dropped.

Revision ID: d3d2cd922bfd
Revises: 1e2e43eb5cf6
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d3d2cd922bfd"
down_revision: str | None = "1e2e43eb5cf6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copy of the defaults Pan.snacked and Achievement.is_global had in the models.
DEFAULTS = {("pan", "snacked"): sa.false(), ("achievement", "is_global"): sa.true()}


def _present() -> list[tuple[str, str]]:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    return [
        (table, column)
        for table, column in DEFAULTS
        if table in tables and column in {c["name"] for c in inspector.get_columns(table)}
    ]


def upgrade() -> None:
    for table, column in _present():
        with op.batch_alter_table(table) as batch:
            batch.alter_column(column, existing_type=sa.Boolean(), server_default=DEFAULTS[table, column])


def downgrade() -> None:
    for table, column in _present():
        with op.batch_alter_table(table) as batch:
            batch.alter_column(column, existing_type=sa.Boolean(), server_default=None)
