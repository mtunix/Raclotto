import enum

from sqlalchemy import Column, Boolean, Integer, Enum

from back.src.model.domain.base import Base, DomainMixin


class IngredientType(enum.IntEnum):
    FILL = 1
    SAUCE = 2


class Ingredient(DomainMixin, Base):
    __tablename__ = "ingredient"

    id = Column(Integer, primary_key=True)
    type = Column(Enum(IngredientType), nullable=False, default=False)
    meat = Column(Boolean, nullable=False, default=False)
    vegetarian = Column(Boolean, nullable=False, default=False)
    vegan = Column(Boolean, nullable=False, default=False)
    gluten = Column(Boolean, nullable=False, default=False)
    histamine = Column(Boolean, nullable=False, default=False)
    fructose = Column(Boolean, nullable=False, default=False)
    lactose = Column(Boolean, nullable=False, default=False)
    available = Column(Boolean, nullable=False, default=True)
