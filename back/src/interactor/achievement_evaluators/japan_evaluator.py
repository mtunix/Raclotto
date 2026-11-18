from typing import Optional

from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import IngredientType
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult,
)


class JapanEvaluator(AchievementEvaluator):
    """
    Evaluator for "JaPan" achievement.
    Description: "Esse eine Pfanne mit ausschließlich Fisch"
    (Eat a pan with only fish)

    This achievement is session-specific. It checks if the user has created
    a pan that contains only fish ingredients (no meat, vegetarian, or vegan ingredients).
    Only fill ingredients are counted (sauces are not counted).
    """

    def _pan_has_only_fish(self, pan: Pan) -> bool:
        """
        Check if a pan contains only fish fill ingredients.

        :param pan: The pan to check
        :return: True if pan has at least one fill ingredient and all fill ingredients are fish
        """
        if not pan.ingredients:
            return False

        # Get all fill ingredients (exclude sauces)
        fill_ingredients = [
            ingredient
            for ingredient in pan.ingredients
            if ingredient.type == IngredientType.FILL
        ]

        # Must have at least one fill ingredient
        if not fill_ingredients:
            return False

        # All fill ingredients must be fish
        return all(ingredient.fish for ingredient in fill_ingredients)

    def evaluate(
        self, pan: Pan, user: User, context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the pan contains only fish fill ingredients.

        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if pan contains only fish
        """
        # Check if this pan has only fish ingredients
        unlocked = self._pan_has_only_fish(pan)

        # Progress is binary: either 0.0 or 1.0
        progress = 1.0 if unlocked else 0.0

        return EvaluationResult(unlocked=unlocked, progress=progress)

    def calculate_progress(
        self, user: User, achievement: Achievement, context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress - binary achievement, either unlocked or not.
        Checks if user has created any pan with only fish fill ingredients.

        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value (0.0 or 1.0)
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0

        # Check if user has created any pan with only fish ingredients in the session
        user_pans_in_session = [
            pan for pan in context.session_pans if pan.user_id == user.id
        ]

        for pan in user_pans_in_session:
            if self._pan_has_only_fish(pan):
                return 1.0

        return 0.0
