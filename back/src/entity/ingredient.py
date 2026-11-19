import enum

from sqlalchemy import CheckConstraint, Enum
from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base
from back.src.entity.mixin import DomainMixin


class IngredientType(enum.IntEnum):
    FILL = 1
    SAUCE = 2


class Ingredient(DomainMixin, Base):
    __tablename__ = "ingredient"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[IngredientType] = mapped_column(Enum(IngredientType), default=False)
    available: Mapped[bool] = mapped_column(default=True)

    """
    The columns meat, vegetarian, vegan and fish are mutually exclusive.
    Please note that this is distinct from a user's Diet (interactor/diet.py), where they are hierarchical.
    In the case of the Ingredient class they note that an ingredient is suitable for a certain diet.
    """
    meat: Mapped[bool] = mapped_column(default=False)
    vegetarian: Mapped[bool] = mapped_column(default=False)
    vegan: Mapped[bool] = mapped_column(default=False)
    fish: Mapped[bool] = mapped_column(default=False)

    """
    The columns histamine, fructose, lactose and gluten are not mutually exclusive.
    They note that an ingredient contains certain substances.
    """
    gluten: Mapped[bool] = mapped_column(default=False)
    histamine: Mapped[bool] = mapped_column(default=False)
    fructose: Mapped[bool] = mapped_column(default=False)
    lactose: Mapped[bool] = mapped_column(default=False)

    # Additional ingredient properties for XP calculation
    spicy: Mapped[int] = mapped_column(default=0)  # 0-3 spiciness level
    wildcard: Mapped[bool] = mapped_column(default=False)
    sweet: Mapped[bool] = mapped_column(default=False)

    __table_args__ = (
        CheckConstraint("NOT (meat AND (vegetarian OR vegan OR fish))", name="check_not_meat_and_other_categories"),
        CheckConstraint("NOT (vegetarian AND (vegan OR fish))", name="check_not_vegetarian_and_other_categories"),
        CheckConstraint("NOT (vegan AND fish)", name="check_not_vegan_and_fish"),
        CheckConstraint("vegetarian OR vegan OR meat OR fish", name="check_at_least_one_category"),
        CheckConstraint("spicy >= 0 AND spicy <= 3", name="check_spicy_range"),
    )
