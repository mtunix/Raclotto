"""Ingredient of the hour: one available fill per session, changing at most once an hour.

    pick = IngredientOfTheHour().current(session)   # None: none picked yet, or it ran out
    pick.ingredient, pick.chosen_at

It is the ingredient of the session's latest ``ingredient_of_the_hour`` event. Its evaluator picks
the next one when a pan is rolled and the event is off cooldown (an hour, or the session's
frequency), so a pick stays until the first roll after its hour. A rolled pan that contains it
earns bonus XP (``Levels``), and users who opt in (``User.add_ingredient_of_the_hour``) get it in
every rolled pan their diet allows (``PanRoll``). Read-only.
"""

from dataclasses import dataclass
from datetime import datetime

from back.src.driver.database import db
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.raclotto_session import RaclottoSession
from back.src.repository.event_repository import EventRepository

EVENT_TYPE = "ingredient_of_the_hour"


@dataclass(frozen=True)
class Pick:
    ingredient: Ingredient
    chosen_at: datetime


class IngredientOfTheHour:
    def __init__(self) -> None:
        self._events = EventRepository()

    def current(self, session: RaclottoSession) -> Pick | None:
        event = self._events.latest(session.id, EVENT_TYPE)
        if event is None or not event.data:
            return None
        ingredient = db.session.get(Ingredient, event.data.get("ingredient_id"))
        if ingredient is None or ingredient.session_id != session.id or not ingredient.available:
            return None
        return Pick(ingredient=ingredient, chosen_at=event.created_at)

    @staticmethod
    def candidates(session: RaclottoSession, current: Pick | None) -> list[Ingredient]:
        """The session's available, named fills, without the current pick."""
        query = db.session.query(Ingredient).filter(
            Ingredient.session_id == session.id,
            Ingredient.type == IngredientType.FILL,
            Ingredient.available.is_(True),
            Ingredient.name.is_not(None),
            Ingredient.name != "",
        )
        if current is not None:
            query = query.filter(Ingredient.id != current.ingredient.id)
        return query.order_by(Ingredient.id).all()
