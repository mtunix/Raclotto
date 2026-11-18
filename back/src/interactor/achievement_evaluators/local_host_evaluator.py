from typing import Optional
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class LocalHostEvaluator(AchievementEvaluator):
    """
    Evaluator for "Local Host" achievement.
    Description: "Eröffne ein Raclotto"
    (Open a single raclotto)
    """
    
    REQUIRED_SESSIONS_COUNT = 1
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has created at least 1 session.
        Note: This evaluator checks the user's total session creation count from context,
        not the current pan. The achievement is unlocked when user_sessions_created >= 1.
        
        :param pan: The newly created pan (not used for this achievement)
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if user has created >= 1 session
        """
        # Check if user has created the required number of sessions
        unlocked = context.user_sessions_created >= self.REQUIRED_SESSIONS_COUNT
        
        # Calculate progress as a ratio
        progress = min(1.0, context.user_sessions_created / self.REQUIRED_SESSIONS_COUNT)
        
        return EvaluationResult(unlocked=unlocked, progress=progress)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress based on the number of sessions created by the user.
        Progress is a ratio of sessions_created / REQUIRED_SESSIONS_COUNT.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value between 0.0 and 1.0
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        # Calculate progress as a ratio
        progress = min(1.0, context.user_sessions_created / self.REQUIRED_SESSIONS_COUNT)
        return progress

