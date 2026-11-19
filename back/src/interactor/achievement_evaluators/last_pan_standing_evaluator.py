from back.src.entity.achievement import Achievement
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    Audience,
    EvaluationContext,
    EvaluationResult,
)
from back.src.interactor.facts import Fact, SessionClosed


class LastPanStandingEvaluator(AchievementEvaluator):
    """
    "Last Pan standing": "Esse die letzte Pfanne eines Raclottos"
    (eat the last pan of a raclotto session).

    Judged when the session closes, for the owner of the most recent pan.
    """

    reacts_to = (SessionClosed,)

    def audience(self, fact: Fact) -> Audience:
        return "last_pan_owner"

    def judge(
        self,
        fact: Fact,
        subject: User,
        achievement: Achievement,
        context: EvaluationContext,
    ) -> EvaluationResult:
        unlocked = self._owns_last_pan(subject, context.session_pans)
        return EvaluationResult(unlocked=unlocked, progress=1.0 if unlocked else 0.0)

    def calculate_progress(self, user: User, achievement: Achievement, context: EvaluationContext) -> float | None:
        if achievement in user.achievements:
            return 1.0
        return 1.0 if self._owns_last_pan(user, context.session_pans) else 0.0

    @staticmethod
    def _owns_last_pan(user: User, session_pans: list[Pan]) -> bool:
        timed = [p for p in session_pans if p.timestamp]
        if not timed:
            return False
        return max(timed, key=lambda p: p.timestamp).user_id == user.id
