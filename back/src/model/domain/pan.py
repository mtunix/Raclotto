from sqlalchemy import Table, ForeignKey, Column, Integer, String
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship

from back.src.model.domain.base import Base, DomainMixin


class Pan(DomainMixin, Base):
    __tablename__ = "pan"

    id = Column(Integer, primary_key=True)
    user = Column(String, nullable=False)
    ingredients = relationship(
        "Ingredient",
        secondary=Table(
            "pan_ingredients",
            Base.metadata,
            Column("pan_id", ForeignKey("pan.id"), primary_key=True, nullable=False),
            Column("ingredient_id", ForeignKey("ingredient.id"), primary_key=True, nullable=False),
        ),
        lazy="selectin"
    )

    ratings = relationship(
        "Rating",
        secondary=Table(
            "pan_ratings",
            Base.metadata,
            Column("pan_id", ForeignKey("pan.id"), primary_key=True, nullable=False),
            Column("rating_id", ForeignKey("rating.id"), primary_key=True, nullable=False),
        ),
        lazy="selectin"
    )

    @hybrid_property
    def rating(self):
        return sum([x.rating for x in self.ratings])/len(self.ratings)

    def as_dict(self):
        cols = super().as_dict()
        cols["ratings"] = [x.as_dict() for x in self.ratings]
        cols["ingredients"] = [x.as_dict() for x in self.ingredients]
        return cols
