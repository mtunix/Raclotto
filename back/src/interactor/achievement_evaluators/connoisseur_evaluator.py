from typing import Optional

from sqlalchemy import func

from back.src.driver.database import db
from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import Ingredient
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult,
)
from back.src.interactor.facts import Fact, IngredientAdded


class ConnoisseurEvaluator(AchievementEvaluator):
    """
    "Connoisseur": "Füge eine nie dagewesene Zutat hinzu"
    (add a never-before-seen ingredient).

    Global. Judged when the user adds an ingredient whose name (case- and
    whitespace-insensitive) exists nowhere else, in any session.
    """

    reacts_to = (IngredientAdded,)

    def judge(
        self,
        fact: Fact,
        subject: User,
        achievement: Achievement,
        context: EvaluationContext,
    ) -> EvaluationResult:
        assert isinstance(fact, IngredientAdded)  # the only fact in reacts_to
        is_new = self._is_name_new(fact.ingredient)
        return EvaluationResult(unlocked=is_new, progress=1.0 if is_new else 0.0)

    def calculate_progress(
        self, user: User, achievement: Achievement, context: EvaluationContext
    ) -> Optional[float]:
        # Only earnable at the moment an ingredient is added; ingredients don't
        # record their author, so there is nothing to recompute afterwards.
        return 1.0 if achievement in user.achievements else 0.0

    @staticmethod
    def _is_name_new(ingredient: Ingredient) -> bool:
        if not ingredient.name or not ingredient.name.strip():
            return False
        normalized = ingredient.name.lower().strip()
        clash = (
            db.session.query(Ingredient.id)
            .filter(func.lower(func.trim(Ingredient.name)) == normalized)
            .filter(Ingredient.id != ingredient.id)
            .first()
        )
        return clash is None
