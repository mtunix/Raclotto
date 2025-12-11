from typing import Optional
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class LocalGuideEvaluator(AchievementEvaluator):
    """
    Evaluator for "Local Guide" achievement.
    Description: "Bewerte 10 Pfannen"
    (Rate 10 pans)
    """
    
    REQUIRED_RATINGS_COUNT = 10
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has rated 10 pans.
        Note: This evaluator checks the user's total rating count from context,
        not the current pan. The achievement is unlocked when user_ratings_count >= 10.
        
        :param pan: The newly created pan (not used for this achievement)
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if user has rated >= 10 pans
        """
        # Check if user has rated the required number of pans
        unlocked = context.user_ratings_count >= self.REQUIRED_RATINGS_COUNT
        
        # Calculate progress as a ratio
        progress = min(1.0, context.user_ratings_count / self.REQUIRED_RATINGS_COUNT)
        
        return EvaluationResult(unlocked=unlocked, progress=progress)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress based on the number of ratings given by the user.
        Progress is a ratio of ratings_count / REQUIRED_RATINGS_COUNT.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value between 0.0 and 1.0
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        # Calculate progress as a ratio
        progress = min(1.0, context.user_ratings_count / self.REQUIRED_RATINGS_COUNT)
        return progress
