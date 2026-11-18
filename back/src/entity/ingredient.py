import enum

from sqlalchemy import Column, Boolean, Integer, Enum, CheckConstraint

from back.src.driver.database import BaseModel
from back.src.entity.mixin import DomainMixin


class IngredientType(enum.IntEnum):
    FILL = 1
    SAUCE = 2


class Ingredient(DomainMixin, BaseModel):
    __tablename__ = "ingredient"

    id = Column(Integer, primary_key=True)
    type = Column(Enum(IngredientType), nullable=False, default=False)
    available = Column(Boolean, nullable=False, default=True)

    """
    The columns meat, vegetarian, vegan and fish are mutually exclusive.
    Please note that this is distinct from a user's Diet (interactor/diet.py), where they are hierarchical.
    In the case of the Ingredient class they note that an ingredient is suitable for a certain diet.
    """
    meat = Column(Boolean, nullable=False, default=False)
    vegetarian = Column(Boolean, nullable=False, default=False)
    vegan = Column(Boolean, nullable=False, default=False)
    fish = Column(Boolean, nullable=False, default=False)

    """
    The columns histamine, fructose, lactose and gluten are not mutually exclusive.
    They note that an ingredient contains certain substances.
    """
    gluten = Column(Boolean, nullable=False, default=False)
    histamine = Column(Boolean, nullable=False, default=False)
    fructose = Column(Boolean, nullable=False, default=False)
    lactose = Column(Boolean, nullable=False, default=False)
    
    # Additional ingredient properties for XP calculation
    spicy = Column(Integer, nullable=False, default=0)  # 0-3 spiciness level
    wildcard = Column(Boolean, nullable=False, default=False)
    sweet = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint(
            "NOT (meat AND (vegetarian OR vegan OR fish))",
            name="check_not_meat_and_other_categories"
        ),
        CheckConstraint(
            "NOT (vegetarian AND (vegan OR fish))",
            name="check_not_vegetarian_and_other_categories"
        ),
        CheckConstraint(
            "NOT (vegan AND fish)",
            name="check_not_vegan_and_fish"
        ),
        CheckConstraint(
            "vegetarian OR vegan OR meat OR fish",
            name="check_at_least_one_category"
        ),
        CheckConstraint(
            "spicy >= 0 AND spicy <= 3",
            name="check_spicy_range"
        )
    )
