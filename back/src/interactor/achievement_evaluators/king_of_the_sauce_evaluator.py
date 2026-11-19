from typing import Optional, Set

from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import IngredientType
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    Audience,
    EvaluationContext,
    EvaluationResult,
)
from back.src.interactor.facts import CatalogChanged, Fact, IngredientAdded, PanRolled
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository


class KingOfTheSauceEvaluator(AchievementEvaluator):
    """
    "King of the Sauce": the user has had a pan with every available sauce.

    Session-scoped achievements look at the fact's session only; global ones
    at every session the user has joined. Lost again when new sauces appear,
    so catalog changes re-judge every member of the session.
    """

    reacts_to = (PanRolled, IngredientAdded, CatalogChanged)
    revocable = True

    def __init__(self) -> None:
        self.ingredient_repository = IngredientRepository()
        self.pan_repository = PanRepository()

    def audience(self, fact: Fact) -> Audience:
        return "actor" if isinstance(fact, PanRolled) else "session_members"

    def judge(
        self,
        fact: Fact,
        subject: User,
        achievement: Achievement,
        context: EvaluationContext,
    ) -> EvaluationResult:
        progress = self._progress(subject, achievement, context)
        return EvaluationResult(unlocked=progress >= 1.0, progress=progress)

    def calculate_progress(
        self, user: User, achievement: Achievement, context: EvaluationContext
    ) -> Optional[float]:
        return self._progress(user, achievement, context)

    def _progress(
        self, user: User, achievement: Achievement, context: EvaluationContext
    ) -> float:
        session_ids = (
            {context.session.id}
            if not achievement.is_global
            else {s.id for s in user.sessions}
        )
        all_sauces = self._available_sauces(session_ids)
        if not all_sauces:
            return 0.0
        used = self._sauces_used(user, session_ids)
        return len(used & all_sauces) / len(all_sauces)

    def _available_sauces(self, session_ids: Set[int]) -> Set[int]:
        sauces = self.ingredient_repository.by_session_ids(
            list(session_ids), IngredientType.SAUCE
        )
        return {s.id for s in sauces if s.available}

    def _sauces_used(self, user: User, session_ids: Set[int]) -> Set[int]:
        return {
            ingredient.id
            for pan in self.pan_repository.by_user(user.id)
            if pan.session_id in session_ids
            for ingredient in pan.ingredients or []
            if ingredient.type == IngredientType.SAUCE
        }
