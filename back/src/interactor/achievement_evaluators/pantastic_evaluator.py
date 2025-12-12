from typing import Optional, Set, List
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)


class PantasticEvaluator(AchievementEvaluator):
    """
    Evaluator for "Pantastic" achievement.
    Description: "Erstelle die best bewerteste Pfanne eines Raclottos (mindestens 2 Bewertungen)"
    (Create the best rated pan of a raclotto session, must have at least 2 ratings)
    
    This achievement is session-specific. It checks if the user has created
    the best rated pan in the current session, and the pan must have been
    rated by at least 2 different people.
    """
    
    MINIMUM_RATINGS_COUNT = 2
    
    def _get_unique_rating_users(self, pan: Pan) -> Set[int]:
        """
        Get the set of unique user IDs who have rated this pan.
        
        :param pan: The pan
        :return: Set of user IDs who rated the pan
        """
        if not pan.ratings:
            return set()
        return {rating.user_id for rating in pan.ratings}
    
    def _is_best_rated_pan(self, pan: Pan, session_pans: List[Pan]) -> bool:
        """
        Check if this pan is the best rated pan in the session.
        Only considers pans that have at least MINIMUM_RATINGS_COUNT ratings.
        
        :param pan: The pan to check
        :param session_pans: All pans in the session
        :return: True if this pan is the best rated (highest average rating)
        """
        # Get unique rating users for this pan
        pan_rating_users = self._get_unique_rating_users(pan)
        
        # Pan must have at least MINIMUM_RATINGS_COUNT ratings from different users
        if len(pan_rating_users) < self.MINIMUM_RATINGS_COUNT:
            return False
        
        # Get pan's average rating
        pan_rating = pan.rating if pan.rating else 0.0
        
        # Check all other pans in the session
        for other_pan in session_pans:
            if other_pan.id == pan.id:
                continue
            
            # Only consider pans with at least MINIMUM_RATINGS_COUNT ratings
            other_rating_users = self._get_unique_rating_users(other_pan)
            if len(other_rating_users) < self.MINIMUM_RATINGS_COUNT:
                continue
            
            # Get other pan's average rating
            other_rating = other_pan.rating if other_pan.rating else 0.0
            
            # If any other pan has a higher or equal rating, this pan is not the best
            if other_rating > pan_rating:
                return False
        
        # This pan has the highest (or tied for highest) rating among pans with enough ratings
        return True
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has created the best rated pan in the session.
        The pan must have been rated by at least 2 different people.
        
        :param pan: The pan to evaluate (should be the pan that was just rated)
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if pan is best rated with >=2 ratings
        """
        # Check if pan has at least MINIMUM_RATINGS_COUNT ratings from different users
        rating_users = self._get_unique_rating_users(pan)
        
        if len(rating_users) < self.MINIMUM_RATINGS_COUNT:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Check if this pan is the best rated in the session
        unlocked = self._is_best_rated_pan(pan, context.session_pans)
        
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
        
        # Check if user has created the best rated pan in the session
        user_pans_in_session = [
            pan for pan in context.session_pans
            if pan.user_id == user.id
        ]
        
        for pan in user_pans_in_session:
            # Check if pan has at least MINIMUM_RATINGS_COUNT ratings
            rating_users = self._get_unique_rating_users(pan)
            if len(rating_users) < self.MINIMUM_RATINGS_COUNT:
                continue
            
            # Check if this pan is the best rated
            if self._is_best_rated_pan(pan, context.session_pans):
                return 1.0
        
        return 0.0

