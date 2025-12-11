from typing import Optional
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class StackOverflowEvaluator(AchievementEvaluator):
    """
    Evaluator for "Stack Overflow!" achievement.
    Description: "Esse eine Pfanne mit mehr als 10 Zutaten"
    (Eat a pan with more than 10 ingredients)
    """
    
    REQUIRED_INGREDIENT_COUNT = 10
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the pan has more than 10 ingredients.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if pan has >10 ingredients
        """
        ingredient_count = len(pan.ingredients) if pan.ingredients else 0
        unlocked = ingredient_count > self.REQUIRED_INGREDIENT_COUNT
        
        return EvaluationResult(unlocked=unlocked)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress based on the maximum ingredient count in user's pans.
        Progress is 1.0 if user has created a pan with >10 ingredients, otherwise 0.0.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value (0.0 or 1.0) or None if not applicable
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        # Check user's pans to see if any have >10 ingredients
        max_ingredients = 0
        for pan in context.user_pans:
            ingredient_count = len(pan.ingredients) if pan.ingredients else 0
            max_ingredients = max(max_ingredients, ingredient_count)
        
        if max_ingredients > self.REQUIRED_INGREDIENT_COUNT:
            return 1.0
        
        # Progress could be calculated as a ratio, but for this achievement
        # it's binary - either you have it or you don't
        return 0.0
