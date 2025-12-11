from typing import Optional
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class FirstBloodEvaluator(AchievementEvaluator):
    """
    Evaluator for "First Blood!" achievement.
    Description: "Esse die erste Pfanne des Raclottos"
    (Eat the first pan of the Raclotto session)
    """
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if this is the first pan in the session.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if this is the first pan
        """
        # The current pan was just created, so session_pans might not include it yet
        # or it might be the only one. We need to check if there are any other pans
        # in the session (excluding this one).
        
        # Filter out the current pan from session_pans
        other_pans = [p for p in context.session_pans if p.id != pan.id]
        
        # If there are no other pans, this is the first pan
        if len(other_pans) == 0:
            return EvaluationResult(unlocked=True)
        
        # Check if this pan's timestamp is earlier than all other pans
        pan_timestamp = pan.timestamp
        if pan_timestamp:
            # Get the earliest timestamp from other pans
            other_timestamps = [p.timestamp for p in other_pans if p.timestamp]
            if other_timestamps:
                earliest_other = min(other_timestamps)
                # This pan is first if its timestamp is earlier or equal to the earliest other
                is_first = pan_timestamp <= earliest_other
            else:
                # If other pans don't have timestamps, assume this is not first
                is_first = False
        else:
            # If this pan doesn't have a timestamp, we can't determine
            is_first = False
        
        return EvaluationResult(unlocked=is_first)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress - binary achievement, either unlocked or not.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value (0.0 or 1.0)
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        # Check if user has created the first pan in any session
        # This would require checking all sessions the user participated in
        # For simplicity, we'll return 0.0 if not unlocked
        # A more complete implementation would check all user sessions
        
        return 0.0
