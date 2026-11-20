from back.src.entity.achievement import Achievement
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import AchievementEvaluator, EvaluationContext, EvaluationResult


class FirstBloodEvaluator(AchievementEvaluator):
    """
    Evaluator for "First Blood!" achievement.
    Description: "Esse die erste Pfanne des Raclottos"
    (Eat the first pan of the Raclotto session)
    """

    def evaluate(self, pan: Pan, user: User, context: EvaluationContext) -> EvaluationResult:
        # The current pan was just created, so session_pans might not include it yet
        # or it might be the only one. We need to check if there are any other pans
        # in the session (excluding this one).

        # Filter out the current pan from session_pans
        other_pans = [p for p in context.session_pans if p.id != pan.id]

        # If there are no other pans, this is the first pan
        if len(other_pans) == 0:
            return EvaluationResult(unlocked=True)

        # This pan is first if its timestamp is earlier or equal to the earliest other
        return EvaluationResult(unlocked=pan.timestamp <= min(p.timestamp for p in other_pans))

    def calculate_progress(self, user: User, achievement: Achievement, context: EvaluationContext) -> float | None:
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0

        # Check if user has created the first pan in any session
        # This would require checking all sessions the user participated in
        # For simplicity, we'll return 0.0 if not unlocked
        # A more complete implementation would check all user sessions

        return 0.0
