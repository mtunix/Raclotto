from typing import Optional, List
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class LastPanStandingEvaluator(AchievementEvaluator):
    """
    Evaluator for "Last Pan standing" achievement.
    Description: "Esse die letzte Pfanne eines Raclottos"
    (Eat the last pan of a raclotto session)
    
    This achievement is session-specific. It checks if the user has created
    the last pan in the session (the pan with the most recent timestamp).
    This achievement is evaluated when the session is closed.
    """
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has created the last pan in the session.
        This method is called when a pan is created, but the achievement
        is typically evaluated when the session is closed.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if this is the last pan
        """
        if not context.session_pans:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Find the pan with the most recent timestamp
        pans_with_timestamps = [p for p in context.session_pans if p.timestamp]
        if not pans_with_timestamps:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        last_pan = max(pans_with_timestamps, key=lambda p: p.timestamp)
        
        # Check if the current pan is the last pan
        unlocked = pan.id == last_pan.id
        
        # Progress is binary: either 0.0 or 1.0
        progress = 1.0 if unlocked else 0.0
        
        return EvaluationResult(unlocked=unlocked, progress=progress)
    
    def evaluate_for_session_close(
        self,
        session_pans: List[Pan],
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Evaluate the achievement when a session is closed.
        This finds the last pan in the session and checks if the given user created it.
        
        :param session_pans: All pans in the session
        :param user: The user to check
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if user created the last pan
        """
        if not session_pans:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Find the pan with the most recent timestamp
        pans_with_timestamps = [p for p in session_pans if p.timestamp]
        if not pans_with_timestamps:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        last_pan = max(pans_with_timestamps, key=lambda p: p.timestamp)
        
        # Check if the user created the last pan
        unlocked = last_pan.user_id == user.id
        
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
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value (0.0 or 1.0)
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        if not context.session_pans:
            return 0.0
        
        # Find the pan with the most recent timestamp
        pans_with_timestamps = [p for p in context.session_pans if p.timestamp]
        if not pans_with_timestamps:
            return 0.0
        
        last_pan = max(pans_with_timestamps, key=lambda p: p.timestamp)
        
        # Check if the user created the last pan
        if last_pan.user_id == user.id:
            return 1.0
        
        return 0.0

