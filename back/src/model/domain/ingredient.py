import enum

from sqlalchemy import Column, Boolean, Integer, Enum

from back.src.model.domain.base import Base, DomainMixin, SerializableMixin


class IngredientType(enum.IntEnum):
    FILL = 0
    SAUCE = 1


class Ingredient(SerializableMixin, DomainMixin, Base):
    __tablename__ = "ingredient"

    id = Column(Integer, primary_key=True)
    type = Column(Enum(IngredientType))
    vegetarian = Column(Boolean)
    vegan = Column(Boolean)
    histamine = Column(Boolean)
    fructose = Column(Boolean)
    lactose = Column(Boolean)
    available = Column(Boolean)