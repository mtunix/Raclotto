from typing import Optional, List
from datetime import datetime, timedelta
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class GarbageCollectorEvaluator(AchievementEvaluator):
    """
    Evaluator for "Garbage Collector" achievement.
    Description: "Esse eine Pfanne nach einer 3-stündigen Pause"
    (Eat a pan after a 3-hour break)
    
    This achievement is session-specific. It checks if the user has eaten
    a pan at least 3 hours after their last pan in the current session.
    """
    
    REQUIRED_HOURS = 3
    
    def _get_previous_pan_in_session(
        self,
        user: User,
        current_pan: Pan,
        session_pans: List[Pan]
    ) -> Optional[Pan]:
        """
        Get the user's previous pan in the session (excluding the current pan).
        
        :param user: The user
        :param current_pan: The current pan being created
        :param session_pans: All pans in the session
        :return: The previous pan or None if this is the user's first pan in the session
        """
        # Filter to only this user's pans in the session, excluding the current pan
        user_pans = [
            pan for pan in session_pans
            if pan.user_id == user.id and pan.id != current_pan.id
        ]
        
        if not user_pans:
            return None
        
        # Sort by timestamp descending to get the most recent previous pan
        user_pans.sort(key=lambda p: p.timestamp if p.timestamp else datetime.min, reverse=True)
        
        return user_pans[0] if user_pans else None
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has eaten a pan at least 3 hours after their last pan
        in the current session.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if 3+ hours have passed
        """
        # Get the user's previous pan in this session
        previous_pan = self._get_previous_pan_in_session(
            user, pan, context.session_pans
        )
        
        # If this is the user's first pan in the session, they can't have the achievement
        if previous_pan is None:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Check if both pans have timestamps
        if not pan.timestamp or not previous_pan.timestamp:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Calculate the time difference
        time_diff = pan.timestamp - previous_pan.timestamp
        
        # Check if at least 3 hours have passed
        required_delta = timedelta(hours=self.REQUIRED_HOURS)
        unlocked = time_diff >= required_delta
        
        # Calculate progress: how close to 3 hours (capped at 1.0)
        if time_diff.total_seconds() > 0:
            progress = min(1.0, time_diff.total_seconds() / required_delta.total_seconds())
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
        Calculate progress based on the time since the user's last pan in the session.
        Progress is 1.0 if 3+ hours have passed, otherwise it's the ratio of elapsed time to 3 hours.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value between 0.0 and 1.0
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        # Get the user's pans in the session
        user_pans = [
            pan for pan in context.session_pans
            if pan.user_id == user.id
        ]
        
        # Need at least 2 pans to have a time difference
        if len(user_pans) < 2:
            return 0.0
        
        # Sort by timestamp to get the most recent two pans
        user_pans.sort(key=lambda p: p.timestamp if p.timestamp else datetime.min, reverse=True)
        
        latest_pan = user_pans[0]
        previous_pan = user_pans[1]
        
        # Check if both pans have timestamps
        if not latest_pan.timestamp or not previous_pan.timestamp:
            return 0.0
        
        # Calculate the time difference
        time_diff = latest_pan.timestamp - previous_pan.timestamp
        
        # Calculate progress
        required_delta = timedelta(hours=self.REQUIRED_HOURS)
        if time_diff.total_seconds() > 0:
            progress = min(1.0, time_diff.total_seconds() / required_delta.total_seconds())
        else:
            progress = 0.0
        
        return progress

