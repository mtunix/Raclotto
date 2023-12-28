import enum
from typing import List

from sqlalchemy import Column, Boolean, Integer, Enum
from sqlalchemy.orm import Mapped, relationship

from back.src.model.domain.base import Base, DomainMixin
from back.src.model.domain.pan import PanIngredients


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

    pans: Mapped[List["PanIngredients"]] = relationship("PanIngredients", back_populates="ingredient")

    def avg_rating(self):
        return sum([x.pan.rating for x in self.pans])/len(self.pans) if len(self.pans) > 0 else 0

    def as_dict(self):
        cols = super().as_dict()
        cols["pan_count"] = len(self.pans)
        cols["avg_rating"] = self.avg_rating()
        return cols
