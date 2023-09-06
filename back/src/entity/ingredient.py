import enum
from typing import NamedTuple

from sqlalchemy import Column, Boolean, Integer, Enum, CheckConstraint

from back.src.driver.database import BaseModel
from back.src.entity.mixin import DomainMixin


class GenerationPreferences(NamedTuple):
    meat: bool
    vegetarian: bool
    vegan: bool
    histamine: bool
    fructose: bool
    lactose: bool
    gluten: bool


class GenerationParameters(NamedTuple):
    session_key: str
    user: int
    num_fill: int
    num_sauce: int
    preferences: GenerationPreferences


class IngredientType(enum.IntEnum):
    FILL = 1
    SAUCE = 2


class Ingredient(DomainMixin, BaseModel):
    __tablename__ = "ingredient"

    id = Column(Integer, primary_key=True)
    type = Column(Enum(IngredientType), nullable=False, default=False)
    available = Column(Boolean, nullable=False, default=True)

    meat = Column(Boolean, nullable=False, default=False)
    vegetarian = Column(Boolean, nullable=False, default=False)
    vegan = Column(Boolean, nullable=False, default=False)
    gluten = Column(Boolean, nullable=False, default=False)
    histamine = Column(Boolean, nullable=False, default=False)
    fructose = Column(Boolean, nullable=False, default=False)
    lactose = Column(Boolean, nullable=False, default=False)

    __tableargs__ = (
        CheckConstraint(
            "NOT (meat AND (vegetarian OR vegan))",
            name="check_not_meat_and_vegetarian_or_vegan"
        ),
        CheckConstraint(
            "NOT (vegetarian AND vegan)",
            name="check_not_vegetarian_and_vegan"
        ),
        CheckConstraint(
            "vegetarian OR vegan OR meat",
            name="check_vegetarian_or_vegan_or_meat"
        )
    )
