from back.src.entity.achievement import Achievement
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import AchievementEvaluator, EvaluationContext, EvaluationResult


class SteakholderEvaluator(AchievementEvaluator):
    """
    Evaluator for "Steakholder" achievement.
    Description: "Esse 5 Pfannen mit Fleisch"
    (Eat 5 pans with meat in a session)

    This achievement is session-specific. It checks if the user has created
    5 pans that contain at least one meat ingredient within the current session.
    """

    REQUIRED_PANS_COUNT = 5

    def _pan_has_meat(self, pan: Pan) -> bool:
        """Check if a pan contains at least one meat ingredient."""
        if not pan.ingredients:
            return False

        return any(ingredient.meat for ingredient in pan.ingredients)

    def _count_meat_pans_in_session(self, user: User, session_pans: list[Pan]) -> int:
        """Count how many pans with meat the user has created in the session."""
        user_pans = [pan for pan in session_pans if pan.user_id == user.id]
        meat_pan_count = 0

        for pan in user_pans:
            if self._pan_has_meat(pan):
                meat_pan_count += 1

        return meat_pan_count

    def evaluate(self, pan: Pan, user: User, context: EvaluationContext) -> EvaluationResult:
        """Check if the user has created 5 pans with meat in the current session."""
        # Count pans with meat in the session (including the new pan)
        meat_pan_count = self._count_meat_pans_in_session(user, context.session_pans)

        # Check if user has reached the required count
        unlocked = meat_pan_count >= self.REQUIRED_PANS_COUNT

        # Calculate progress as ratio of current count to required count
        progress = min(1.0, meat_pan_count / self.REQUIRED_PANS_COUNT)

        return EvaluationResult(unlocked=unlocked, progress=progress)

    def calculate_progress(self, user: User, achievement: Achievement, context: EvaluationContext) -> float | None:
        """
        Calculate progress based on the number of pans with meat eaten.
        Progress is a ratio of meat_pan_count / REQUIRED_PANS_COUNT.
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0

        # Count pans with meat in the session
        meat_pan_count = self._count_meat_pans_in_session(user, context.session_pans)

        # Calculate progress as a ratio
        progress = min(1.0, meat_pan_count / self.REQUIRED_PANS_COUNT)

        return progress
