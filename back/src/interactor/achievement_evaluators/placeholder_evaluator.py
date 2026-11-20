from back.src.entity.achievement import Achievement
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import AchievementEvaluator, EvaluationContext, EvaluationResult


class PlaceholderEvaluator(AchievementEvaluator):
    """Placeholder evaluator for achievements that don't have specific implementations yet."""

    reacts_to = ()

    def evaluate(self, pan: Pan, user: User, context: EvaluationContext) -> EvaluationResult:
        """Placeholder evaluation - always returns not unlocked."""
        return EvaluationResult(unlocked=False)

    def calculate_progress(self, user: User, achievement: Achievement, context: EvaluationContext) -> float | None:
        """Placeholder progress calculation - returns None (progress not applicable)."""
        return None
