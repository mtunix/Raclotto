from typing import Optional
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class PlaceholderEvaluator(AchievementEvaluator):
    """Placeholder evaluator for achievements that don't have specific implementations yet."""
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Placeholder evaluation - always returns not unlocked.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=False
        """
        return EvaluationResult(unlocked=False)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Placeholder progress calculation - returns None (progress not applicable).
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: None (progress tracking not applicable for placeholder)
        """
        return None
