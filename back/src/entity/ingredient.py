import enum
from dataclasses import dataclass
from typing import NamedTuple

from sqlalchemy import Column, Boolean, Integer, Enum, CheckConstraint

from back.src.driver.database import BaseModel
from back.src.entity.mixin import DomainMixin


class InvalidPreferencesError(ValueError):
    pass


@dataclass
class GenerationPreferences:
    """
    A named tuple that represents the preferences for a generation.
    Please note that meat, vegetarian and vegan are not mutually exclusive.
    Instead, they are a hierarchy, where vegan is the most restrictive and meat the least (basically omnivore).
    This means if meat is set to true, vegetarian and vegan are automatically set to true as well.
    If vegetarian is set to true, vegan is automatically set to true as well.
    """

    def __init__(
            self,
            meat: bool,
            vegetarian: bool,
            vegan: bool,
            histamine: bool,
            fructose: bool,
            lactose: bool,
            gluten: bool
    ):
        if not meat and not vegetarian and not vegan:
            raise InvalidPreferencesError

        if meat and not (vegetarian and vegan):
            raise InvalidPreferencesError

        if vegetarian and not vegan:
            raise InvalidPreferencesError

        self.meat = meat
        self.vegetarian = vegetarian
        self.vegan = vegan
        self.histamine = histamine
        self.fructose = fructose
        self.lactose = lactose
        self.gluten = gluten

    def __str__(self):
        return f"meat: {self.meat}, vegetarian: {self.vegetarian}, vegan: {self.vegan}, histamine: {self.histamine}, fructose: {self.fructose}, lactose: {self.lactose}, gluten: {self.gluten}"


@dataclass
class GenerationParameters:
    def __init__(
            self,
            session_key: str,
            user: int,
            num_fill: int,
            num_sauce: int,
            preferences: GenerationPreferences
    ):
        self.session_key = session_key
        self.user = user
        self.num_fill = num_fill
        self.num_sauce = num_sauce
        self.preferences = preferences

    def __str__(self):
        return (f"GenerationParameters\n"
                f"session_key: {self.session_key}\n"
                f"user: {self.user}\n"
                f"num_fill: {self.num_fill}\n"
                f"num_sauce: {self.num_sauce}\n"
                f"preferences: {self.preferences}")


class IngredientType(enum.IntEnum):
    FILL = 1
    SAUCE = 2


class Ingredient(DomainMixin, BaseModel):
    __tablename__ = "ingredient"

    id = Column(Integer, primary_key=True)
    type = Column(Enum(IngredientType), nullable=False, default=False)
    available = Column(Boolean, nullable=False, default=True)

    """
    The columns meat, vegetarian and vegan are mutually exclusive.
    Please note that this is distinct from the GenerationPreferences where they are hierarchical.
    In the case of the Ingredient class they note that an ingredient is suitable for a certain diet.
    """
    meat = Column(Boolean, nullable=False, default=False)
    vegetarian = Column(Boolean, nullable=False, default=False)
    vegan = Column(Boolean, nullable=False, default=False)

    """
    The columns histamine, fructose, lactose and gluten are not mutually exclusive.
    They note that an ingredient contains certain substances.
    """
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
