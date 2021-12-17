from sqlalchemy import String, Column, Boolean, Integer

from back.src.model.domain.base import Base, DomainMixin


class Ingredient(DomainMixin, Base):
    __tablename__ = "ingredient"

    id = Column(Integer, primary_key=True)
    type = Column(Integer)
    vegetarian = Column(Boolean)
    vegan = Column(Boolean)
    histamine = Column(Boolean)
    fructose = Column(Boolean)
    lactose = Column(Boolean)
    available = Column(Boolean)
