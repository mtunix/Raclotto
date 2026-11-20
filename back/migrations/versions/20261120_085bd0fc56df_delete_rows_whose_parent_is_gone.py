"""delete rows whose parent is gone

SQLite didn't enforce foreign keys, so deleting a session left its pans, ratings, events and the
rest behind, pointing at nothing. Before the app enforces them (ADR 0009), every row whose
reference is dangling goes, as the models' cascades now take a session's or a pan's dependants
along, and then whatever depended on it. An optional reference in `CLEARED` is set to null
instead: the row means something without it. Counts are logged per table. ``preparation_type``
also gains the foreign key on ``session_id`` its column always meant, so a session's own types
are checked and cleaned like the rest.

Revision ID: 085bd0fc56df
Revises: d3d2cd922bfd
Create Date: 2026-11-20
"""

import logging
from collections import Counter
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine import Connection

revision: str = "085bd0fc56df"
down_revision: str | None = "d3d2cd922bfd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

logger = logging.getLogger("alembic.runtime.migration")

# Frozen: the nullable references whose null means "none" (no creator, preparation type or level).
# A null session on an event config or preparation type means a global one, so those rows go.
CLEARED = frozenset(
    {
        ("session", "created_by_user_id"),
        ("pan", "preparation_type_id"),
        ("user", "level_id"),
        ("profile_picture_history", "level_id"),
    }
)
PREPARATION_TYPE_SESSION = "fk_preparation_type_session_id_session"


def upgrade() -> None:
    bind = op.get_bind()
    session_keys = [fk["constrained_columns"] for fk in sa.inspect(bind).get_foreign_keys("preparation_type")]
    if ["session_id"] not in session_keys:
        with op.batch_alter_table("preparation_type") as batch:
            batch.create_foreign_key(PREPARATION_TYPE_SESSION, "session", ["session_id"], ["id"])

    deleted: Counter[str] = Counter()
    cleared: Counter[str] = Counter()
    # Deleting a row can leave its own dependants dangling; the next pass takes them.
    while violations := _violations(bind):
        resolved = 0
        for table, key in sorted(violations):
            column, parent, parent_column = _reference(bind, table, key)
            parents = f'SELECT "{parent_column}" FROM "{parent}" WHERE "{parent_column}" IS NOT NULL'
            dangling = f'"{column}" NOT IN ({parents})'
            if (table, column) in CLEARED:
                count = bind.exec_driver_sql(f'UPDATE "{table}" SET "{column}" = NULL WHERE {dangling}').rowcount
                cleared[f"{table}.{column}"] += count
            else:
                count = bind.exec_driver_sql(f'DELETE FROM "{table}" WHERE {dangling}').rowcount
                deleted[table] += count
            resolved += count
        if not resolved:
            raise RuntimeError(f"Foreign key violations remain that deleting can't resolve: {sorted(violations)}")

    for table, count in sorted(deleted.items()):
        logger.warning("Deleted %d rows of %s whose parent was gone", count, table)
    for column, count in sorted(cleared.items()):
        logger.warning("Cleared %s in %d rows whose parent was gone", column, count)


def downgrade() -> None:
    with op.batch_alter_table("preparation_type") as batch:
        batch.drop_constraint(PREPARATION_TYPE_SESSION, type_="foreignkey")


def _violations(bind: Connection) -> set[tuple[str, int]]:
    """Each table and foreign key id with a row whose parent is missing."""
    return {(row[0], row[3]) for row in bind.exec_driver_sql("PRAGMA foreign_key_check").all()}


def _reference(bind: Connection, table: str, key: int) -> tuple[str, str, str]:
    """The referencing column, the parent table and the referenced column of a single-column foreign key."""
    rows = [row for row in bind.exec_driver_sql(f'PRAGMA foreign_key_list("{table}")').all() if row[0] == key]
    if len(rows) != 1:
        raise RuntimeError(f"Foreign key {key} of {table} spans {len(rows)} columns; clean it by hand")
    _, _, parent, column, parent_column, *_ = rows[0]
    return column, parent, parent_column or "rowid"
