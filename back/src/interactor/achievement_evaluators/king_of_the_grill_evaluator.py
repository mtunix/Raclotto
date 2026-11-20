from collections import Counter

from back.src.entity.achievement import Achievement
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    Audience,
    EvaluationContext,
    EvaluationResult,
)
from back.src.interactor.facts import Fact, PanDeleted, PanRolled


class KingOfTheGrillEvaluator(AchievementEvaluator):
    """
    Evaluator for "King of the Grill" achievement.
    Description: "Esse am meisten Pfannen in einem Raclotto"
    (Eat the most pans in a raclotto session)

    Every member of the session is judged again whenever a pan is rolled or deleted there, since
    either can change who has the most pans. Ties share the achievement.
    """

    reacts_to = (PanRolled, PanDeleted)
    revocable = True

    def audience(self, fact: Fact) -> Audience:
        return "session_members"

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

    @staticmethod
    def _progress(user: User, context: EvaluationContext) -> float:
        """The user's pans in the session against the most anyone has there."""
        counts = Counter(pan.user_id for pan in context.session_pans)
        most = max(counts.values(), default=0)
        return counts[user.id] / most if most else 0.0
