import enum

from sqlalchemy import Column, Boolean, Integer, Enum, CheckConstraint

from back.src.entity.base import Base, DomainMixin


class IngredientType(enum.IntEnum):
    FILL = 1
    SAUCE = 2


class Ingredient(DomainMixin, Base):
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
