from enum import StrEnum

from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base


class AchievementKey(StrEnum):
    """Names an achievement for its evaluator and for the frontend, which translates title and description by it."""

    gotta_eat_em_all = "gotta_eat_em_all"
    king_of_the_sauce = "king_of_the_sauce"
    stack_overflow = "stack_overflow"
    king_of_the_grill = "king_of_the_grill"
    garbage_collector = "garbage_collector"
    happy_new_year = "happy_new_year"
    local_guide = "local_guide"
    local_host = "local_host"
    first_blood = "first_blood"
    double_kill = "double_kill"
    second_to_none = "second_to_none"
    duel = "duel"
    connoisseur = "connoisseur"
    last_pan_standing = "last_pan_standing"
    easter_egg = "easter_egg"
    vanilla = "vanilla"
    pandler = "pandler"
    wizard = "wizard"
    survival_of_the_fittest = "survival_of_the_fittest"
    raclotto_normalverbraucher = "raclotto_normalverbraucher"
    verpant = "verpant"
    pantastic = "pantastic"
    steakholder = "steakholder"
    biotonne = "biotonne"
    pan_sexual = "pan_sexual"
    japan = "japan"
    pan_o_rama = "pan_o_rama"
    panini = "panini"
    panda = "panda"
    pan_nic = "pan_nic"
    copy_paste = "copy_paste"
    cheesus_christ = "cheesus_christ"
    marzi_pan = "marzi_pan"
    firewall = "firewall"
    cheese_not_found = "cheese_not_found"


class Achievement(Base):
    __tablename__ = "achievement"

    id: Mapped[int] = mapped_column(primary_key=True)
    # An AchievementKey; null only on rows of achievements default_data no longer seeds.
    key: Mapped[str | None] = mapped_column(unique=True, index=True)
    # The seed's name for the row in the database and logs; the UI shows the translation of `key`.
    title: Mapped[str | None]
    value: Mapped[int | None]
    hidden: Mapped[bool | None]
    is_global: Mapped[bool] = mapped_column(default=True)
    """
    Flag to indicate if achievement is global or session-specific.
    - True: Achievement is global (evaluated across all sessions)
    - False: Achievement is session-specific (evaluated within a single session)
    """
