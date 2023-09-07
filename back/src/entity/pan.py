from datetime import datetime

from sqlalchemy import Table, ForeignKey, Column, Integer, String, func, select, DateTime, Boolean
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship

from back.src.driver.database import BaseModel
from back.src.entity.mixin import DomainMixin
from back.src.entity.rating import Rating

pan_ingredients = Table(
    "pan_ingredients",
    BaseModel.metadata,
    Column("pan_id", ForeignKey("pan.id"), primary_key=True, nullable=False),
    Column("ingredient_id", ForeignKey("ingredient.id"), primary_key=True, nullable=False),
)


class Pan(DomainMixin, BaseModel):
    __tablename__ = "pan"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.now())
    snacked = Column(Boolean, nullable=False, default=False)

    ingredients = relationship(
        "Ingredient",
        secondary=pan_ingredients,
        lazy="selectin"
    )

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
        cols["rating"] = self.rating
        cols["ratings"] = [x.as_dict() for x in self.ratings]
        cols["ingredients"] = [x.as_dict() for x in self.ingredients]
        return cols
