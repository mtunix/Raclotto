from typing import Optional
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import IngredientType
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class VanillaEvaluator(AchievementEvaluator):
    """
    Evaluator for "Vanilla" achievement.
    Description: "Esse eine Pfanne mit nur einer Zutat"
    (Eat a pan with only one ingredient)
    
    This achievement is session-specific. It checks if the user has created
    a pan with exactly one ingredient in the current session.
    """
    
    REQUIRED_INGREDIENT_COUNT = 1
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the pan has exactly one fill ingredient (sauces are not counted).
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if pan has exactly 1 fill ingredient
        """
        # Count only fill ingredients, exclude sauces
        fill_ingredients = [
            ingredient for ingredient in (pan.ingredients or [])
            if ingredient.type == IngredientType.FILL
        ]
        fill_count = len(fill_ingredients)
        unlocked = fill_count == self.REQUIRED_INGREDIENT_COUNT
        
        # Progress is binary: either 0.0 or 1.0
        progress = 1.0 if unlocked else 0.0
        
        return EvaluationResult(unlocked=unlocked, progress=progress)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress - binary achievement, either unlocked or not.
        Only counts fill ingredients, sauces are excluded.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value (0.0 or 1.0)
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        # Check if user has created any pan with exactly one fill ingredient in the session
        user_pans_in_session = [
            pan for pan in context.session_pans
            if pan.user_id == user.id
        ]
        
        for pan in user_pans_in_session:
            # Count only fill ingredients, exclude sauces
            fill_ingredients = [
                ingredient for ingredient in (pan.ingredients or [])
                if ingredient.type == IngredientType.FILL
            ]
            fill_count = len(fill_ingredients)
            if fill_count == self.REQUIRED_INGREDIENT_COUNT:
                return 1.0
        
        return 0.0

