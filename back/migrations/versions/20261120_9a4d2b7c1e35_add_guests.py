"""add guests

A guest is a user without a password, so ``user.password`` becomes nullable; every session gets a
``join_code`` for its join link, generated here for the existing ones. Invites no longer carry an
email: ``invite_token.email`` is retired and gets an empty server default so inserts keep working.
Like the first revision, it leaves alone what an unstamped database built by create_all has.

Revision ID: 9a4d2b7c1e35
Revises: 6c1f0a7d2e94
Create Date: 2026-11-20
"""

import secrets
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9a4d2b7c1e35"
down_revision: str | None = "6c1f0a7d2e94"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JOIN_CODE_UNIQUE = "uq_session_join_code"


def _columns(table: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    if "email" in _columns("invite_token"):
        with op.batch_alter_table("invite_token") as batch:
            batch.alter_column("email", existing_type=sa.String(), server_default="")
    if "join_code" in _columns("session"):
        return

    with op.batch_alter_table("user") as batch:
        batch.alter_column("password", existing_type=sa.String(), nullable=True)
    op.add_column("session", sa.Column("join_code", sa.String(), nullable=True))
    bind = op.get_bind()
    session = sa.table("session", sa.column("id", sa.Integer), sa.column("join_code", sa.String))
    for (session_id,) in bind.execute(sa.select(session.c.id)).all():
        bind.execute(session.update().where(session.c.id == session_id).values(join_code=secrets.token_urlsafe(9)))
    with op.batch_alter_table("session") as batch:
        batch.alter_column("join_code", existing_type=sa.String(), nullable=False)
        batch.create_unique_constraint(JOIN_CODE_UNIQUE, ["join_code"])


def downgrade() -> None:
    with op.batch_alter_table("session") as batch:
        batch.drop_constraint(JOIN_CODE_UNIQUE, type_="unique")
        batch.drop_column("join_code")
    with op.batch_alter_table("invite_token") as batch:
        batch.alter_column("email", existing_type=sa.String(), server_default=None)
    with op.batch_alter_table("user") as batch:
        batch.alter_column("password", existing_type=sa.String(), nullable=False)
