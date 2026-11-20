from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import IngredientType
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    Audience,
    EvaluationContext,
    EvaluationResult,
)
from back.src.interactor.facts import CatalogChanged, Fact, IngredientAdded, PanDeleted, PanRolled, SessionDeleted
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository


class KingOfTheSauceEvaluator(AchievementEvaluator):
    """
    "King of the Sauce": the user has had a pan with every available sauce of the fact's session.

    Lost again when new sauces appear, so catalog changes re-judge every member of the session, when
    its author deletes the only pan with a sauce, or when the session is deleted.
    """

    reacts_to = (PanRolled, PanDeleted, IngredientAdded, CatalogChanged, SessionDeleted)
    revocable = True

    def __init__(self) -> None:
        self.ingredient_repository = IngredientRepository()
        self.pan_repository = PanRepository()

    def audience(self, fact: Fact) -> Audience:
        return "actor" if isinstance(fact, (PanRolled, PanDeleted)) else "session_members"

    def judge(
        self,
        fact: Fact,
        subject: User,
        achievement: Achievement,
        context: EvaluationContext,
    ) -> EvaluationResult:
        progress = self._progress(subject, context)
        return EvaluationResult(unlocked=progress >= 1.0, progress=progress)

    def calculate_progress(self, user: User, achievement: Achievement, context: EvaluationContext) -> float | None:
        return self._progress(user, context)

    def _progress(self, user: User, context: EvaluationContext) -> float:
        all_sauces = self._available_sauces(context.session.id)
        if not all_sauces:
            return 0.0
        used = self._sauces_used(user, context.session.id)
        return len(used & all_sauces) / len(all_sauces)

    def _available_sauces(self, session_id: int) -> set[int]:
        sauces = self.ingredient_repository.by_session_ids([session_id], IngredientType.SAUCE)
        return {s.id for s in sauces if s.available}

    def _sauces_used(self, user: User, session_id: int) -> set[int]:
        return {
            ingredient.id
            for pan in self.pan_repository.by_user(user.id)
            if pan.session_id == session_id
            for ingredient in pan.ingredients or []
            if ingredient.type == IngredientType.SAUCE
        }
