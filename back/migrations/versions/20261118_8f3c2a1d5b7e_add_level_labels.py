"""add level labels

Databases created before the English/German level labels existed lack both columns. This is the
first revision, so it also meets databases that already have them (created later by create_all,
never stamped) and leaves those alone.

Revision ID: 8f3c2a1d5b7e
Revises:
Create Date: 2026-11-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8f3c2a1d5b7e"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copy of back/src/model/default_data.py LEVELS as of this revision.
LABELS = {
    "level.pfannenPraktikant": ("Pan Apprentice", "Pfannen Praktikant"),
    "level.kaeseKnauserer": ("Cheese Miser", "Käse Knauserer"),
    "level.kartoffelPionier": ("Potato Pioneer", "Kartoffel Pionier"),
    "level.beilagenBaendiger": ("Side Dish Tamer", "Beilagen Bändiger"),
    "level.knoblauchKrieger": ("Garlic Warrior", "Knoblauch Krieger"),
    "level.saucenSucher": ("Sauce Seeker", "Saucen Sucher"),
    "level.jalapenoJaeger": ("Jalapeño Hunter", "Jalapeño Jäger"),
    "level.ananasApostel": ("Pineapple Apostle", "Ananas Apostel"),
    "level.zwiebelZelebrator": ("Onion Celebrator", "Zwiebel Zelebrator"),
    "level.pfannenArchitekt": ("Pan Architect", "Pfannen Architekt"),
    "level.drehDoktor": ("Spin Doctor", "Dreh Doktor"),
    "level.zufallsZaehmer": ("Randomness Tamer", "Zufalls Zähmer"),
    "level.stapelSpezialist": ("Stack Specialist", "Stapel Spezialist"),
    "level.vierSchichtVirtuose": ("Four Layer Virtuoso", "Vier Schicht Virtuose"),
    "level.jackpotJaeger": ("Jackpot Hunter", "Jackpot Jäger"),
    "level.gaumenGrossherzog": ("Palate Grand Duke", "Gaumen Großherzog"),
    "level.brutzlerBoss": ("Sizzler Boss", "Brutzler Boss"),
    "level.kaeseKaiser": ("Cheese Emperor", "Käse Kaiser"),
    "level.gourmetGouverneur": ("Gourmet Governor", "Gourmet Gouverneur"),
    "level.raclottoRegent": ("Raclotto Regent", "Raclotto Regent"),
}


def _missing_label_columns() -> list[str]:
    inspector = sa.inspect(op.get_bind())
    if "level" not in inspector.get_table_names():
        # create_all builds the table with both columns after the migrations run.
        return []
    present = {column["name"] for column in inspector.get_columns("level")}
    return [name for name in ("label_en", "label_de") if name not in present]


def upgrade() -> None:
    missing = _missing_label_columns()
    if not missing:
        return

    with op.batch_alter_table("level") as batch:
        for name in missing:
            batch.add_column(sa.Column(name, sa.String(), nullable=False, server_default=""))

    level = sa.table("level", sa.column("name", sa.String), *(sa.column(n, sa.String) for n in missing))
    for name, (label_en, label_de) in LABELS.items():
        values = {"label_en": label_en, "label_de": label_de}
        op.execute(level.update().where(level.c.name == name).values({column: values[column] for column in missing}))
    # Levels outside the default set still need a readable label.
    for column in missing:
        op.execute(level.update().where(level.c[column] == "").values({column: level.c.name}))


def downgrade() -> None:
    with op.batch_alter_table("level") as batch:
        batch.drop_column("label_de")
        batch.drop_column("label_en")
