from back.src.entity.achievement import Achievement
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import AchievementEvaluator, EvaluationContext, EvaluationResult
from back.src.interactor.facts import Fact, PanRolled, SessionOpened


class LocalHostEvaluator(AchievementEvaluator):
    """
    "Local Host": "Eröffne ein Raclotto" (open a raclotto).

    Judged when the user opens a session; rolling judges it again for creators of sessions opened before
    the achievement reacted to that.
    """

    REQUIRED_SESSIONS_COUNT = 1
    reacts_to = (SessionOpened, PanRolled)

    def judge(
        self,
        fact: Fact,
        subject: User,
        achievement: Achievement,
        context: EvaluationContext,
    ) -> EvaluationResult:
        progress = self._progress(context)
        return EvaluationResult(unlocked=progress >= 1.0, progress=progress)

    def calculate_progress(self, user: User, achievement: Achievement, context: EvaluationContext) -> float | None:
        if achievement in user.achievements:
            return 1.0
        return self._progress(context)

    def _progress(self, context: EvaluationContext) -> float:
        return min(1.0, context.user_sessions_created / self.REQUIRED_SESSIONS_COUNT)
