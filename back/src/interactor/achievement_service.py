from typing import List, Optional
from back.src.entity.achievement import Achievement
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.user_achievement_progress import UserAchievementProgress
from back.src.entity.rating import Rating
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.achievement_evaluator import EvaluationContext, EvaluationResult
from back.src.interactor.achievement_registry import get_registry
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository
from back.src.repository.session_repository import SessionRepository
from back.src.repository.achievement_repository import AchievementRepository
from back.src.repository.user_repository import UserRepository
from back.src.repository.user_achievement_progress_repository import UserAchievementProgressRepository
from back.src.driver.database import db


class AchievementService:
    def __init__(self):
        self.pan_repository = PanRepository()
        self.rating_repository = RatingRepository()
        self.session_repository = SessionRepository()
        self.achievement_repository = AchievementRepository()
        self.user_repository = UserRepository()
        self.progress_repository = UserAchievementProgressRepository()
        self.registry = get_registry()
    
    def _build_evaluation_context(self, user: User, session: RaclottoSession) -> EvaluationContext:
        """
        Build evaluation context for achievement evaluation.
        
        :param user: The user
        :param session: The current session
        :return: EvaluationContext with all necessary data
        """
        # Expire any cached queries to ensure we get fresh data
        db.session.expire_all()
        
        # Get all pans created by the user
        user_pans = self.pan_repository.by_user(user.id)
        
        # Get all pans in the current session
        session_pans = self.pan_repository.by_session(session.key)
        
        # Count ratings given by user - use a fresh query to ensure we see committed changes
        user_ratings_count = self.rating_repository.count_by_user(user.id)
        
        # Count sessions created by user
        user_sessions_created = len(self.session_repository.by_creator(user.id))
        
        return EvaluationContext(
            session=session,
            user_pans=user_pans,
            session_pans=session_pans,
            user_ratings_count=user_ratings_count,
            user_sessions_created=user_sessions_created
        )
    
    def evaluate_achievements_for_pan(self, pan: Pan, user: User) -> List[Achievement]:
        """
        Evaluate all achievements for a newly created pan.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :return: List of newly unlocked achievements
        """
        # Get the session for this pan
        session = self.session_repository.by_id(pan.session_id)
        if not session:
            return []
        
        # Build evaluation context
        context = self._build_evaluation_context(user, session)
        
        # Get all achievements
        achievements = self.achievement_repository.all()
        
        newly_unlocked = []
        
        # Get user's unlocked achievements
        unlocked_achievement_ids = self.user_repository.get_unlocked_achievements(user.id)
        
        for achievement in achievements:
            # For session-specific achievements, always evaluate (they're session-scoped)
            # For global achievements, skip if already unlocked
            if achievement.is_global and achievement.id in unlocked_achievement_ids:
                continue
            
            # Get evaluator for this achievement
            evaluator = self.registry.get_evaluator(achievement)
            if not evaluator:
                continue
            
            # Evaluate the achievement
            result = evaluator.evaluate(pan, user, context)
            
            # Update progress if applicable
            if result.progress is not None:
                self.update_progress(user.id, achievement.id, result.progress)
            
            # Unlock if achieved
            # For session-specific achievements, unlock if achieved in this session
            # For global achievements, unlock if achieved overall
            if result.unlocked:
                if achievement.id not in unlocked_achievement_ids:
                    self.unlock_achievement(user.id, achievement.id)
                    newly_unlocked.append(achievement)
        
        return newly_unlocked
    
    def evaluate_achievements_for_rating(self, rating, user: User) -> List[Achievement]:
        """
        Evaluate all achievements for a newly created rating.
        This is used for achievements that are based on rating actions (e.g., "Local Guide").
        
        :param rating: The newly created rating
        :param user: The user who created the rating
        :return: List of newly unlocked achievements
        """
        # Get the pan that was rated
        pan = self.pan_repository.by_id(rating.pan_id)
        if not pan:
            return []
        
        # Get the session for this pan
        session = self.session_repository.by_id(pan.session_id)
        if not session:
            return []
        
        # Build evaluation context (this will include the updated rating count)
        context = self._build_evaluation_context(user, session)
        
        # Get all achievements
        achievements = self.achievement_repository.all()
        
        newly_unlocked = []
        
        # Get user's unlocked achievements
        unlocked_achievement_ids = self.user_repository.get_unlocked_achievements(user.id)
        
        for achievement in achievements:
            # For session-specific achievements, always evaluate (they're session-scoped)
            # For global achievements, skip if already unlocked
            if achievement.is_global and achievement.id in unlocked_achievement_ids:
                continue
            
            # Get evaluator for this achievement
            evaluator = self.registry.get_evaluator(achievement)
            if not evaluator:
                continue
            
            # Evaluate the achievement
            result = evaluator.evaluate(pan, user, context)
            
            # Update progress if applicable
            if result.progress is not None:
                self.update_progress(user.id, achievement.id, result.progress)
            
            # Unlock if achieved
            # For session-specific achievements, unlock if achieved in this session
            # For global achievements, unlock if achieved overall
            if result.unlocked:
                if achievement.id not in unlocked_achievement_ids:
                    self.unlock_achievement(user.id, achievement.id)
                    newly_unlocked.append(achievement)
        
        return newly_unlocked
    
    def get_user_progress(self, user_id: int, achievement_id: int) -> Optional[float]:
        """
        Get the current progress for a user's achievement.
        
        :param user_id: User ID
        :param achievement_id: Achievement ID
        :return: Progress value (0.0-1.0) or None if not tracked
        """
        progress = self.progress_repository.by_user_and_achievement(user_id, achievement_id)
        
        if progress:
            return progress.progress_value
        return None
    
    def update_progress(self, user_id: int, achievement_id: int, progress: float):
        """
        Update progress for a user's achievement.
        
        :param user_id: User ID
        :param achievement_id: Achievement ID
        :param progress: Progress value between 0.0 and 1.0
        """
        self.progress_repository.create_or_update(user_id, achievement_id, progress)
    
    def unlock_achievement(self, user_id: int, achievement_id: int):
        """
        Unlock an achievement for a user.
        
        :param user_id: User ID
        :param achievement_id: Achievement ID
        """
        user = self.user_repository.by_id(user_id)
        achievement = self.achievement_repository.by_id(achievement_id)
        
        if not user or not achievement:
            return
        
        # Check if already unlocked
        if achievement in user.achievements:
            return
        
        # Add achievement to user
        user.achievements.append(achievement)
        
        # Set progress to 1.0
        self.progress_repository.create_or_update(user_id, achievement_id, 1.0)
        
        db.session.flush()
    
    def revoke_achievement(self, user_id: int, achievement_id: int):
        """
        Revoke an achievement from a user.
        
        :param user_id: User ID
        :param achievement_id: Achievement ID
        """
        user = self.user_repository.by_id(user_id)
        achievement = self.achievement_repository.by_id(achievement_id)
        
        if not user or not achievement:
            return
        
        # Check if unlocked
        if achievement not in user.achievements:
            return
        
        # Remove achievement from user
        user.achievements.remove(achievement)
        
        db.session.flush()
    
    def re_evaluate_achievement_for_user(self, user: User, achievement: Achievement, session: RaclottoSession):
        """
        Re-evaluate an achievement for a user and update progress/unlock status.
        This is used when conditions change (e.g., new sauce added).
        
        :param user: The user
        :param achievement: The achievement to re-evaluate
        :param session: A session for context (can be any session the user is in)
        """
        # Build evaluation context
        context = self._build_evaluation_context(user, session)
        
        # Get evaluator for this achievement
        evaluator = self.registry.get_evaluator(achievement)
        if not evaluator:
            return
        
        # Calculate progress first
        progress = evaluator.calculate_progress(user, achievement, context)
        
        if progress is not None:
            self.update_progress(user.id, achievement.id, progress)
        
        # Check if achievement should be unlocked or revoked
        # Get a pan for evaluation (use first user pan or create minimal context)
        user_pans = self.pan_repository.by_user(user.id)
        if user_pans:
            # Use the most recent pan for evaluation
            pan = user_pans[-1]
            result = evaluator.evaluate(pan, user, context)
            
            # Update progress from evaluation result
            if result.progress is not None:
                self.update_progress(user.id, achievement.id, result.progress)
            
            # If unlocked, ensure it's unlocked
            if result.unlocked:
                if achievement not in user.achievements:
                    self.unlock_achievement(user.id, achievement.id)
            else:
                # If not unlocked but user has it, revoke it
                if achievement in user.achievements:
                    self.revoke_achievement(user.id, achievement.id)
        else:
            # User has no pans, so they can't have used any sauces
            # If they have the achievement, revoke it
            if achievement in user.achievements:
                self.revoke_achievement(user.id, achievement.id)
            # Progress should already be 0.0 from calculate_progress

