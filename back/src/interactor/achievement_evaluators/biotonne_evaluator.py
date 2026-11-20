from back.src.entity.achievement import Achievement
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import AchievementEvaluator, EvaluationContext, EvaluationResult


class BiotonneEvaluator(AchievementEvaluator):
    """
    Evaluator for "Biotonne" achievement.
    Description: "Esse 5 vegane Pfannen"
    (Eat 5 vegan pans in a session)

    This achievement is session-specific. It checks if the user has created
    5 pans that contain only vegan ingredients within the current session.
    A pan is vegan if all its ingredients are vegan.
    """

    REQUIRED_PANS_COUNT = 5

    def _pan_is_vegan(self, pan: Pan) -> bool:
        """Check if a pan is vegan (all ingredients must be vegan)."""
        if not pan.ingredients:
            return False

        # A pan is vegan if all ingredients are vegan
        return all(ingredient.vegan for ingredient in pan.ingredients)

    def _count_vegan_pans_in_session(self, user: User, session_pans: list[Pan]) -> int:
        """Count how many vegan pans the user has created in the session."""
        user_pans = [pan for pan in session_pans if pan.user_id == user.id]
        vegan_pan_count = 0

        for pan in user_pans:
            if self._pan_is_vegan(pan):
                vegan_pan_count += 1

        return vegan_pan_count

    def evaluate(self, pan: Pan, user: User, context: EvaluationContext) -> EvaluationResult:
        """Check if the user has created 5 vegan pans in the current session."""
        # Count vegan pans in the session (including the new pan)
        vegan_pan_count = self._count_vegan_pans_in_session(user, context.session_pans)

        # Check if user has reached the required count
        unlocked = vegan_pan_count >= self.REQUIRED_PANS_COUNT

        # Calculate progress as ratio of current count to required count
        progress = min(1.0, vegan_pan_count / self.REQUIRED_PANS_COUNT)

        return EvaluationResult(unlocked=unlocked, progress=progress)

    def calculate_progress(self, user: User, achievement: Achievement, context: EvaluationContext) -> float | None:
        """
        Calculate progress based on the number of vegan pans eaten.
        Progress is a ratio of vegan_pan_count / REQUIRED_PANS_COUNT.
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0

        # Count vegan pans in the session
        vegan_pan_count = self._count_vegan_pans_in_session(user, context.session_pans)

        # Calculate progress as a ratio
        progress = min(1.0, vegan_pan_count / self.REQUIRED_PANS_COUNT)

        return progress
