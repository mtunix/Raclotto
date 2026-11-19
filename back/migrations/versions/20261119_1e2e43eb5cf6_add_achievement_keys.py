"""add achievement keys

Achievements gain ``key``, which their evaluators and the frontend's translations name them by. The
frontend has its own descriptions in each language; the old ``description`` column stays, unmapped,
so no data is lost. Rows of achievements the seed data no longer has keep a null key.

Revision ID: 1e2e43eb5cf6
Revises: 3d9e6b2f4a10
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "1e2e43eb5cf6"
down_revision: str | None = "3d9e6b2f4a10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copy of the titles and keys of back/src/model/default_data.py ACHIEVEMENTS as of this revision.
KEYS = {
    "Gotta eat'em all!": "gotta_eat_em_all",
    "King of the Sauce": "king_of_the_sauce",
    "Stack Overflow!": "stack_overflow",
    "King of the Grill": "king_of_the_grill",
    "Garbage Collector": "garbage_collector",
    "Happy new Year": "happy_new_year",
    "Local Guide": "local_guide",
    "Local Host": "local_host",
    "First Blood!": "first_blood",
    "Double Kill!": "double_kill",
    "Second to none": "second_to_none",
    "Zeit für ein D- D- D- Duell!": "duel",
    "Connoisseur": "connoisseur",
    "Last Pan standing": "last_pan_standing",
    "Easter Egg": "easter_egg",
    "Vanilla": "vanilla",
    "Pandler": "pandler",
    "Wizard": "wizard",
    "Survival of the Fittest": "survival_of_the_fittest",
    "Raclotto Normalverbraucher": "raclotto_normalverbraucher",
    "VerPant": "verpant",
    "Pantastic": "pantastic",
    "Steakholder": "steakholder",
    "Biotonne": "biotonne",
    "Pan Sexual": "pan_sexual",
    "JaPan": "japan",
    "Pan-O-Rama": "pan_o_rama",
    "Panini": "panini",
    "Panda": "panda",
    "Pan-nic": "pan_nic",
    "Copy & Paste": "copy_paste",
    "Cheesus Christ": "cheesus_christ",
    "Marzi-Pan": "marzi_pan",
    "Firewall": "firewall",
    "404 Cheese not found": "cheese_not_found",
}


def upgrade() -> None:
    present = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("achievement")}
    if "key" in present:
        return
    with op.batch_alter_table("achievement") as batch:
        batch.add_column(sa.Column("key", sa.String(), nullable=True))

    achievement = sa.table(
        "achievement", sa.column("id", sa.Integer), sa.column("title", sa.String), sa.column("key", sa.String)
    )
    # Titles were never unique; with duplicates, the first row keeps the identity.
    for title, key in KEYS.items():
        first = sa.select(sa.func.min(achievement.c.id)).where(achievement.c.title == title).scalar_subquery()
        op.execute(achievement.update().where(achievement.c.id == first).values(key=key))
    op.create_index("ix_achievement_key", "achievement", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_achievement_key", table_name="achievement")
    with op.batch_alter_table("achievement") as batch:
        batch.drop_column("key")
