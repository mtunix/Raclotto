import enum

from sqlalchemy import Column, Boolean, Integer, Enum

from back.src.model.domain.base import Base, DomainMixin


class IngredientType(enum.Enum):
    FILL = enum.auto()
    SAUCE = enum.auto()


class Ingredient(DomainMixin, Base):
    __tablename__ = "ingredient"

    id = Column(Integer, primary_key=True)
    type = Column(Enum(IngredientType))
    vegetarian = Column(Boolean)
    vegan = Column(Boolean)
    histamine = Column(Boolean)
    fructose = Column(Boolean)
    lactose = Column(Boolean)
    available = Column(Boolean)
