from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.api.serializer import serialize_single, serialize_collection, serialize_entity
from back.src.api.constants import JSONAPI_VERSION
from back.src.repository import RatingRepository, UserRepository, SessionRepository
from back.src.repository.achievement_repository import AchievementRepository
from back.src.auth.middleware import require_auth, get_current_user
from back.src.interactor.achievement_service import AchievementService
from back.src.driver.database import db


class AchievementApi(BaseApi):
    url_prefix = "/achievements"
    
    def __init__(self):
        super().__init__()
        self.repository = AchievementRepository()
        self.achievement_service = AchievementService()
        self.session_repository = SessionRepository()
        self.user_repository = UserRepository()
        self.rating_repository = RatingRepository()
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_achievements(self):
        """List all achievements with progress and unlocked status.
        
        :returns List[Achievement]: List of achievements
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        achievements = self.repository.all()
        user = get_current_user()
        
        # Enrich achievements with progress and unlocked status
        # Expire the user object to ensure we get fresh data from the database
        db.session.expire(user)
        # Expire the achievements relationship to reload it
        db.session.expire(user, ['achievements'])
        # Get unlocked achievements using repository
        unlocked_achievement_ids = self.user_repository.get_unlocked_achievements(user.id)
        
        # Build evaluation context to calculate current progress if needed
        # Use the first session the user is in, or create a minimal context
        from back.src.entity.raclotto_session import RaclottoSession
        from back.src.interactor.achievement_evaluator import EvaluationContext
        
        # Get a session for context (use first active session or any session)
        active_sessions = self.session_repository.active_sessions()
        user_session = active_sessions[0] if active_sessions else None
        if not user_session:
            # Try any session if no active one
            all_sessions = self.session_repository.all()
            user_session = all_sessions[0] if all_sessions else None
        
        if user_session:
            context = self.achievement_service._build_evaluation_context(user, user_session)
        else:
            # If no session exists at all, create a minimal context with just the counts we need
            user_pans = self.achievement_service.pan_repository.by_user(user.id)
            user_ratings_count = self.rating_repository.count_by_user(user.id)
            user_sessions_created = len(self.session_repository.by_creator(user.id))
            # Create a minimal context - we'll only use it for progress calculation
            # We need a session object, so create a temporary one (won't be saved)
            from datetime import datetime
            import uuid
            dummy_session = RaclottoSession(
                key=str(uuid.uuid4()),
                name="temp",
                timestamp=datetime.now(),
                active=False
            )
            context = EvaluationContext(
                session=dummy_session,
                user_pans=user_pans,
                session_pans=[],
                user_ratings_count=user_ratings_count,
                user_sessions_created=user_sessions_created
            )
        
        enriched_achievements = []
        for achievement in achievements:
            # Check if unlocked
            is_unlocked = achievement.id in unlocked_achievement_ids
            
            # Get stored progress, or calculate it if not stored
            progress = self.achievement_service.get_user_progress(user.id, achievement.id)
            
            # If no stored progress, try to calculate it using the evaluator
            if progress is None:
                evaluator = self.achievement_service.registry.get_evaluator(achievement)
                if evaluator:
                    calculated_progress = evaluator.calculate_progress(user, achievement, context)
                    if calculated_progress is not None:
                        progress = calculated_progress
                        # Store the calculated progress
                        self.achievement_service.update_progress(user.id, achievement.id, progress)
                        db.session.flush()
            
            # Debug logging
            import logging
            logging.info(f"Achievement {achievement.title} (ID: {achievement.id}): unlocked={is_unlocked}, progress={progress}")
            
            # Create enriched serialization
            achievement_dict = serialize_entity(achievement, "achievement")
            if achievement_dict and achievement_dict.get("attributes"):
                achievement_dict["attributes"]["unlocked"] = is_unlocked
                # Always include progress, even if None (frontend can handle it)
                achievement_dict["attributes"]["progress"] = progress
                logging.info(f"Added to achievement_dict: unlocked={achievement_dict['attributes'].get('unlocked')}, progress={achievement_dict['attributes'].get('progress')}")
            else:
                logging.warning(f"Failed to serialize achievement {achievement.title} or missing attributes")
            
            enriched_achievements.append(achievement_dict)
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": enriched_achievements
        }
    
    @BaseApi.endpoint("/<int:achievement_id>", ["GET"])
    @require_auth
    def get_achievement(self, achievement_id: int):
        """Get an achievement by ID.
        
        :param achievement_id: Achievement ID
        :returns Achievement: Achievement
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Achievement not found
        """
        achievement = self.repository.by_id(achievement_id)
        if not achievement:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Achievement not found",
                detail="The specified achievement does not exist"
            )
        
        return serialize_single(achievement, "achievement")
