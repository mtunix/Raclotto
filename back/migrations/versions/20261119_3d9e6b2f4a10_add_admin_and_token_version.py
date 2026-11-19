"""add admin flag and token version

Users gain ``is_admin`` and ``token_version``. The user the admin seed creates, named ``admin``,
becomes the first admin. Like the first revision, it leaves columns alone that an unstamped
database built by create_all already has.

Revision ID: 3d9e6b2f4a10
Revises: 8f3c2a1d5b7e
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3d9e6b2f4a10"
down_revision: str | None = "8f3c2a1d5b7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copy of the name App.init_admin_user gives the seeded admin.
ADMIN_NAME = "admin"


def upgrade() -> None:
    present = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("user")}
    columns = [
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    ]
    missing = [column for column in columns if column.name not in present]
    if not missing:
        return
    with op.batch_alter_table("user") as batch:
        for column in missing:
            batch.add_column(column)
    if "is_admin" in present:
        return

    user = sa.table("user", sa.column("name", sa.String), sa.column("is_admin", sa.Boolean))
    op.execute(user.update().where(user.c.name == ADMIN_NAME).values(is_admin=True))


def downgrade() -> None:
    with op.batch_alter_table("user") as batch:
        batch.drop_column("token_version")
        batch.drop_column("is_admin")
