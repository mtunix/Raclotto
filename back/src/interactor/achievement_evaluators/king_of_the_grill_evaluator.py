from typing import Optional, Dict, List
from collections import Counter
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class KingOfTheGrillEvaluator(AchievementEvaluator):
    """
    Evaluator for "King of the Grill" achievement.
    Description: "Esse am meisten Pfannen in einem Raclotto"
    (Eat the most pans in a raclotto session)
    
    This achievement is evaluated after each pan creation to check if the user
    has the most pans in the current session. If multiple users are tied for
    the most pans, all of them can have the achievement.
    """
    
    def _count_pans_per_user(self, session_pans: List[Pan]) -> Dict[int, int]:
        """
        Count the number of pans per user in the session.
        
        :param session_pans: List of all pans in the session
        :return: Dictionary mapping user_id to pan count
        """
        user_pan_counts = Counter()
        for pan in session_pans:
            user_pan_counts[pan.user_id] += 1
        return dict(user_pan_counts)
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has the most pans in the current session.
        This is evaluated after each pan creation, so the newly created pan
        is included in the session_pans list.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if user has the most pans
        """
        # Count pans per user in the session
        # Note: session_pans should include the newly created pan
        user_pan_counts = self._count_pans_per_user(context.session_pans)
        
        if not user_pan_counts:
            # No pans in session, achievement cannot be unlocked
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Get the user's pan count
        user_count = user_pan_counts.get(user.id, 0)
        
        # Find the maximum pan count in the session
        max_count = max(user_pan_counts.values()) if user_pan_counts else 0
        
        # User has the achievement if they have the maximum count
        # (ties are allowed - multiple users can be "King of the Grill")
        unlocked = user_count == max_count and max_count > 0
        
        # Calculate progress based on how close the user is to the max
        # Progress is 1.0 if they're at the max, otherwise it's their count / max_count
        if max_count > 0:
            progress = min(1.0, user_count / max_count)
        else:
            progress = 0.0
        
        return EvaluationResult(unlocked=unlocked, progress=progress)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress based on the user's pan count relative to the max in the session.
        Progress is 1.0 if the user has the most pans, otherwise it's their count / max_count.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value between 0.0 and 1.0
        """
        # Count pans per user in the session
        user_pan_counts = self._count_pans_per_user(context.session_pans)
        
        if not user_pan_counts:
            return 0.0
        
        # Get the user's pan count
        user_count = user_pan_counts.get(user.id, 0)
        
        # Find the maximum pan count in the session
        max_count = max(user_pan_counts.values()) if user_pan_counts else 0
        
        if max_count == 0:
            return 0.0
        
        # Calculate progress
        progress = min(1.0, user_count / max_count)
        
        # If user has the achievement but progress is less than 1.0,
        # it means someone else has more pans now
        if achievement in user.achievements and progress < 1.0:
            # Progress will be updated by revocation logic
            return progress
        
        return progress

