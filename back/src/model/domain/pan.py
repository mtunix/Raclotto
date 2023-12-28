from datetime import datetime
from typing import List

from sqlalchemy import Table, ForeignKey, Column, Integer, String, func, select, DateTime
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship, backref, Mapped

from back.src.model.domain.base import Base, DomainMixin
from back.src.model.domain.rating import Rating


class PanIngredients(Base):
    __tablename__ = 'pan_ingredients'
    pan_id = Column(Integer, ForeignKey('pan.id'), primary_key=True, nullable=False)
    ingredient_id = Column(Integer, ForeignKey('ingredient.id'), primary_key=True, nullable=False)

    pan: Mapped["Pan"] = relationship("Pan", back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship("Ingredient", back_populates="pans")


class Pan(DomainMixin, Base):
    __tablename__ = "pan"

    id = Column(Integer, primary_key=True)
    user = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.now())
    ingredients: Mapped[List["PanIngredients"]] = relationship("PanIngredients", back_populates="pan")

    ratings = relationship(
        "Rating",
        lazy="selectin"
    )

    @hybrid_property
    def rating(self):
        if len(self.ratings) > 0:
            return sum([x.rating for x in self.ratings])/len(self.ratings)
        else:
            return 0

    @rating.expression
    def rating(cls):
        return select(func.avg(Rating.rating))\
            .select_from(Rating)\
            .where(cls.id == Rating.pan_id)\
            .group_by(Rating.pan_id)

    def as_dict(self):
        cols = super().as_dict()
        cols["timestamp"] = self.timestamp.isoformat()
        cols["rating"] = self.rating
        cols["ratings"] = [x.as_dict() for x in self.ratings]
        cols["ingredients"] = [x.ingredient.as_dict() for x in self.ingredients]
        return cols
