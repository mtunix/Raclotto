from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, ScalarSelect, Table, func, select
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from back.src.driver.database import Base
from back.src.entity.mixin import DomainMixin
from back.src.entity.rating import Rating

if TYPE_CHECKING:
    from back.src.entity.ingredient import Ingredient
    from back.src.entity.preparation_type import PreparationType

pan_ingredients = Table(
    "pan_ingredients",
    Base.metadata,
    Column("pan_id", ForeignKey("pan.id"), primary_key=True, nullable=False),
    Column("ingredient_id", ForeignKey("ingredient.id"), primary_key=True, nullable=False),
)


class Pan(DomainMixin, Base):
    __tablename__ = "pan"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    timestamp: Mapped[datetime] = mapped_column(default=datetime.now)
    snacked: Mapped[bool] = mapped_column(default=False)
    preparation_type_id: Mapped[int | None] = mapped_column(ForeignKey("preparation_type.id"))
    cheese_level: Mapped[int | None] = mapped_column(default=0)
    rolled_preparation_type: Mapped[bool] = mapped_column(default=False)
    rolled_cheese: Mapped[bool] = mapped_column(default=False)

    ingredients: Mapped[list[Ingredient]] = relationship("Ingredient", secondary=pan_ingredients, lazy="selectin")

    ratings: Mapped[list[Rating]] = relationship("Rating", lazy="selectin")

    preparation_type: Mapped[PreparationType | None] = relationship("PreparationType", lazy="selectin")

    @hybrid_property
    def rating(self) -> float:
        if len(self.ratings) > 0:
            return sum([x.rating for x in self.ratings]) / len(self.ratings)
        else:
            return 0

    @rating.inplace.expression
    @classmethod
    def _rating_expression(cls) -> ScalarSelect[float]:
        return (
            select(func.avg(Rating.rating))
            .select_from(Rating)
            .where(cls.id == Rating.pan_id)
            .group_by(Rating.pan_id)
            .scalar_subquery()
        )
