from typing import Optional, Set
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import IngredientType
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.session_repository import SessionRepository
from back.src.repository.achievement_repository import AchievementRepository
from back.src.repository.user_repository import UserRepository
from back.src.driver.database import db


class KingOfTheSauceEvaluator(AchievementEvaluator):
    """
    Evaluator for "King of the Sauce" achievement.
    Description: "User has had a pan with each sauce in the raclotto"
    (User has used all sauces in sessions they participate in)
    """
    
    def __init__(self):
        self.ingredient_repository = IngredientRepository()
        self.session_repository = SessionRepository()
        self.achievement_repository = AchievementRepository()
        self.user_repository = UserRepository()
    
    def _get_all_sauces_in_user_sessions(self, user: User, session_id: Optional[int] = None) -> Set[int]:
        """
        Get all sauce ingredient IDs from sessions.
        If session_id is provided, only get sauces from that session (session-specific).
        Otherwise, get sauces from all sessions the user participates in (global).
        
        :param user: The user
        :param session_id: Optional session ID to limit to (for session-specific achievements)
        :return: Set of sauce ingredient IDs
        """
        if session_id is not None:
            # Session-specific: only get sauces from the specified session
            session = self.session_repository.by_id(session_id)
            if not session:
                return set()
            sauces = self.ingredient_repository.by_type(session.key, IngredientType.SAUCE)
        else:
            # Global: get sauces from all sessions the user is part of
            session_ids = [s.id for s in user.sessions] if user.sessions else []
            
            if not session_ids:
                return set()
            
            sauces = self.ingredient_repository.by_session_ids(session_ids, IngredientType.SAUCE)
        
        return {sauce.id for sauce in sauces}
    
    def _get_sauces_used_by_user(self, user: User, session_id: Optional[int] = None) -> Set[int]:
        """
        Get all sauce ingredient IDs that the user has used in their pans.
        If session_id is provided, only count sauces from pans in that session (session-specific).
        Otherwise, count sauces from all pans (global).
        
        :param user: The user
        :param session_id: Optional session ID to limit to (for session-specific achievements)
        :return: Set of sauce ingredient IDs that the user has used
        """
        # Get pans created by the user
        from back.src.repository.pan_repository import PanRepository
        pan_repository = PanRepository()
        if session_id is not None:
            # Session-specific: only get pans from the specified session
            session = self.session_repository.by_id(session_id)
            if not session:
                return set()
            all_session_pans = pan_repository.by_session(session.key)
            # Filter to only pans created by this user
            user_pans = [pan for pan in all_session_pans if pan.user_id == user.id]
        else:
            # Global: get all pans created by the user
            user_pans = pan_repository.by_user(user.id)
        
        # Collect all sauce IDs from user's pans
        used_sauces = set()
        for pan in user_pans:
            if pan.ingredients:
                for ingredient in pan.ingredients:
                    if ingredient.type == IngredientType.SAUCE:
                        used_sauces.add(ingredient.id)
        
        return used_sauces
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has used all sauces.
        For session-specific achievements, only checks sauces in the current session.
        For global achievements, checks sauces across all sessions the user participates in.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if user has used all sauces
        """
        # Get the achievement to check if it's session-specific
        achievement = self.achievement_repository.by_title("King of the Sauce")
        is_session_specific = achievement and not achievement.is_global if achievement else False
        
        # Determine which session to check
        session_id = context.session.id if is_session_specific else None
        
        # Get all sauces (in session or globally)
        all_sauces = self._get_all_sauces_in_user_sessions(user, session_id)
        
        if not all_sauces:
            # No sauces exist, achievement cannot be unlocked
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Get sauces the user has used (including from the new pan)
        used_sauces = self._get_sauces_used_by_user(user, session_id)
        
        # Check if user has used all sauces
        unlocked = used_sauces >= all_sauces
        
        # Calculate progress
        progress = len(used_sauces) / len(all_sauces) if all_sauces else 0.0
        
        return EvaluationResult(unlocked=unlocked, progress=progress)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress based on the ratio of sauces used to total sauces.
        For session-specific achievements, only checks sauces in the current session.
        For global achievements, checks sauces across all sessions the user participates in.
        Progress is a ratio of used_sauces / total_sauces.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value between 0.0 and 1.0
        """
        # Check if achievement is session-specific
        is_session_specific = not achievement.is_global
        
        # Determine which session to check
        session_id = context.session.id if is_session_specific else None
        
        # Get all sauces (in session or globally)
        all_sauces = self._get_all_sauces_in_user_sessions(user, session_id)
        
        if not all_sauces:
            return 0.0
        
        # Get sauces the user has used
        used_sauces = self._get_sauces_used_by_user(user, session_id)
        
        # Calculate progress as a ratio
        progress = len(used_sauces) / len(all_sauces)
        
        # If user has the achievement but progress is less than 1.0, 
        # it means a new sauce was added and they need to use it
        if achievement in user.achievements and progress < 1.0:
            # Progress will be updated by revocation logic
            return progress
        
        return min(1.0, progress)

