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
from back.src.repository.pan_repository import PanRepository


class GottaEatEmAllEvaluator(AchievementEvaluator):
    """
    Evaluator for "Gotta eat'em all!" achievement.
    Description: "Esse alle Zutaten des Raclottos"
    (Eat all ingredients (FILL, not sauces) of the current session)
    """
    
    def __init__(self):
        self.ingredient_repository = IngredientRepository()
        self.session_repository = SessionRepository()
        self.pan_repository = PanRepository()
    
    def _get_all_fill_ingredients_in_session(self, session_id: int) -> Set[int]:
        """
        Get all FILL ingredient IDs from the current session.
        
        :param session_id: Session ID
        :return: Set of FILL ingredient IDs
        """
        session = self.session_repository.by_id(session_id)
        if not session:
            return set()
        
        fills = self.ingredient_repository.by_type(session.key, IngredientType.FILL)
        return {fill.id for fill in fills}
    
    def _get_fill_ingredients_used_by_user(self, user: User, session_id: int) -> Set[int]:
        """
        Get all FILL ingredient IDs that the user has used in their pans in the current session.
        
        :param user: The user
        :param session_id: Session ID
        :return: Set of FILL ingredient IDs that the user has used
        """
        session = self.session_repository.by_id(session_id)
        if not session:
            return set()
        
        # Get all pans from the session
        all_session_pans = self.pan_repository.by_session(session.key)
        # Filter to only pans created by this user
        user_pans = [pan for pan in all_session_pans if pan.user_id == user.id]
        
        # Collect all FILL ingredient IDs from user's pans
        used_fills = set()
        for pan in user_pans:
            if pan.ingredients:
                for ingredient in pan.ingredients:
                    if ingredient.type == IngredientType.FILL:
                        used_fills.add(ingredient.id)
        
        return used_fills
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has eaten all FILL ingredients (not sauces) from the current session.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if user has eaten all FILL ingredients
        """
        # This achievement is session-specific, so only check the current session
        session_id = context.session.id
        
        # Get all FILL ingredients in the current session
        all_fills = self._get_all_fill_ingredients_in_session(session_id)
        
        if not all_fills:
            # No FILL ingredients exist, achievement cannot be unlocked
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Get FILL ingredients the user has used (including from the new pan)
        used_fills = self._get_fill_ingredients_used_by_user(user, session_id)
        
        # Check if user has used all FILL ingredients
        unlocked = used_fills >= all_fills
        
        # Calculate progress
        progress = len(used_fills) / len(all_fills) if all_fills else 0.0
        
        return EvaluationResult(unlocked=unlocked, progress=progress)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress based on the ratio of FILL ingredients eaten to total FILL ingredients.
        Progress is a ratio of used_fills / total_fills.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value between 0.0 and 1.0
        """
        # This achievement is session-specific, so only check the current session
        session_id = context.session.id
        
        # Get all FILL ingredients in the current session
        all_fills = self._get_all_fill_ingredients_in_session(session_id)
        
        if not all_fills:
            return 0.0
        
        # Get FILL ingredients the user has used
        used_fills = self._get_fill_ingredients_used_by_user(user, session_id)
        
        # Calculate progress as a ratio
        progress = len(used_fills) / len(all_fills)
        
        # If user has the achievement but progress is less than 1.0, 
        # it means a new FILL ingredient was added and they need to eat it
        if achievement in user.achievements and progress < 1.0:
            # Progress will be updated by revocation logic
            return progress
        
        return min(1.0, progress)

