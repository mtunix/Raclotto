import random

from back.src.interactor.event_evaluator import EventEvaluator, Triggered
from back.src.interactor.facts import Fact, PanRolled
from back.src.interactor.ingredient_of_the_hour import EVENT_TYPE, IngredientOfTheHour


class IngredientOfTheHourEvaluator(EventEvaluator):
    """Picks the session's next ingredient of the hour, never the current one again."""

    event_type = EVENT_TYPE

    def __init__(self, rng: random.Random | None = None):
        self._rng = rng or random.Random()

    def evaluate(self, fact: Fact) -> Triggered | None:
        if not isinstance(fact, PanRolled):
            return None
        picks = IngredientOfTheHour()
        candidates = picks.candidates(fact.session, picks.current(fact.session))
        if not candidates:
            return None
        ingredient = self._rng.choice(candidates)
        return Triggered(
            message=f"Ingredient of the hour: {ingredient.name}",
            data={"ingredient_id": ingredient.id, "ingredient_name": ingredient.name},
        )
