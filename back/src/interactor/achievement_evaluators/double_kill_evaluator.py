from typing import Optional, List, Set
from datetime import datetime
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class DoubleKillEvaluator(AchievementEvaluator):
    """
    Evaluator for "Double Kill!" achievement.
    Description: "Erhalte eine identische Pfanne direkt hintereinander"
    (Get an identical pan directly after another)
    
    This achievement is session-specific. It checks if the user has created
    two consecutive pans with identical ingredients in the current session.
    """
    
    def _get_ingredient_ids(self, pan: Pan) -> Set[int]:
        """
        Get the set of ingredient IDs for a pan.
        
        :param pan: The pan
        :return: Set of ingredient IDs
        """
        if not pan.ingredients:
            return set()
        return {ingredient.id for ingredient in pan.ingredients}
    
    def _are_pans_identical(self, pan1: Pan, pan2: Pan) -> bool:
        """
        Check if two pans have identical ingredients.
        Two pans are identical if they have the same set of ingredient IDs.
        
        :param pan1: First pan
        :param pan2: Second pan
        :return: True if pans have identical ingredients
        """
        ingredients1 = self._get_ingredient_ids(pan1)
        ingredients2 = self._get_ingredient_ids(pan2)
        
        return ingredients1 == ingredients2
    
    def _get_previous_pan_in_session(
        self,
        user: User,
        current_pan: Pan,
        session_pans: List[Pan]
    ) -> Optional[Pan]:
        """
        Get the user's previous pan in the session (excluding the current pan).
        Returns the most recent pan created by the user before the current pan.
        
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
        Check if the user has created two consecutive pans with identical ingredients
        in the current session.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if pans are identical
        """
        # Get the user's previous pan in this session
        previous_pan = self._get_previous_pan_in_session(
            user, pan, context.session_pans
        )
        
        # If this is the user's first pan in the session, they can't have the achievement
        if previous_pan is None:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Check if the pans have identical ingredients
        unlocked = self._are_pans_identical(pan, previous_pan)
        
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
        
        # Get the user's pans in the session
        user_pans = [
            pan for pan in context.session_pans
            if pan.user_id == user.id
        ]
        
        # Need at least 2 pans to check for identical consecutive pans
        if len(user_pans) < 2:
            return 0.0
        
        # Sort by timestamp to get the most recent pans
        user_pans.sort(key=lambda p: p.timestamp if p.timestamp else datetime.min, reverse=True)
        
        # Check if the two most recent pans are identical
        latest_pan = user_pans[0]
        previous_pan = user_pans[1]
        
        if self._are_pans_identical(latest_pan, previous_pan):
            return 1.0
        
        return 0.0

