from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth, get_current_user
from back.src.repository.session_repository import SessionRepository
from back.src.api.serializer import serialize_single, serialize_collection
from back.src.api.deserializer import deserialize_attributes
from back.src.driver.database import db


class SessionApi(BaseApi):
    url_prefix = "/sessions"
    
    def __init__(self):
        super().__init__()
        self.repository = SessionRepository()
    
    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_session(self):
        """Create a new session.
        
        Request body should contain:
        - name: Session name
        
        :returns RaclottoSession: Created session
        :status_code 201: Session created successfully
        :status_code 401: Not authenticated
        """
        user = get_current_user()
        attributes = deserialize_attributes()
        name = attributes.get('name')
        
        if not name:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="name is required"
            )
        
        session = self.repository.create_with_key(name, user.id)
        
        # Track when user joins the session (they created it, so they're automatically in it)
        # This is used for achievements like "Pandler"
        from back.src.entity.user import user_sessions
        from datetime import datetime
        
        # Add user to session with timestamp
        db.session.execute(
            user_sessions.insert().values(
                user_id=user.id,
                session_id=session.id,
                joined_at=datetime.now()
            )
        )
        
        db.session.commit()
        
        return serialize_single(session, "session")
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_sessions(self):
        """List all sessions (active and inactive).
        
        Query parameters:
        - include_inactive: If true, includes inactive sessions (default: false)
        
        :returns List[RaclottoSession]: List of sessions
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        if include_inactive:
            sessions = self.repository.all_sessions()
        else:
            sessions = self.repository.active_sessions()
        return serialize_collection(sessions, "session")
    
    @BaseApi.endpoint("/<int:session_id>", ["GET"])
    @require_auth
    def get_session(self, session_id: int):
        """Get a session by ID.
        
        :param session_id: Session ID
        :returns RaclottoSession: Session
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        session = self.repository.by_id(session_id)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        return serialize_single(session, "session")
    
    @BaseApi.endpoint("/by-key", ["GET"])
    @require_auth
    def get_session_by_key(self):
        """Get a session by key.
        
        Query parameters:
        - session_key: Session key
        
        :returns RaclottoSession: Session
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="session_key query parameter is required"
            )
        
        session = self.repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        return serialize_single(session, "session")
    
    @BaseApi.endpoint("/<int:session_id>", ["PATCH"])
    @require_auth
    def update_session(self, session_id: int):
        """Update a session.
        
        :param session_id: Session ID
        :returns RaclottoSession: Updated session
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        session = self.repository.by_id(session_id)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        attributes = deserialize_attributes()
        updated = self.repository.update(session_id, attributes)
        db.session.commit()
        
        return serialize_single(updated, "session")
    
    @BaseApi.endpoint("/<int:session_id>", ["DELETE"])
    @require_auth
    def delete_session(self, session_id: int):
        """Delete a session.
        
        :param session_id: Session ID
        :status_code 204: Success
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        if not self.repository.exists(session_id):
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        self.repository.delete(session_id)
        db.session.commit()
        
        return None, 204
    
    @BaseApi.endpoint("/close", ["POST"])
    @require_auth
    def close_session(self):
        """Close a session.
        
        Request body should contain:
        - key: Session key
        
        :returns RaclottoSession: Closed session
        :status_code 200: Session closed
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        attributes = deserialize_attributes()
        session_key = attributes.get('key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="key is required"
            )
        
        session = self.repository.close_session(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Evaluate "Last Pan standing" achievement when session is closed
        from back.src.interactor.achievement_service import AchievementService
        from back.src.repository.pan_repository import PanRepository
        from back.src.repository.achievement_repository import AchievementRepository
        from back.src.repository.user_repository import UserRepository
        
        achievement_service = AchievementService()
        pan_repository = PanRepository()
        achievement_repository = AchievementRepository()
        user_repository = UserRepository()
        
        # Get all pans in the session
        session_pans = pan_repository.by_session(session_key)
        
        if session_pans:
            # Find the pan with the most recent timestamp
            pans_with_timestamps = [p for p in session_pans if p.timestamp]
            
            if pans_with_timestamps:
                last_pan = max(pans_with_timestamps, key=lambda p: p.timestamp)
                # Get the user who created the last pan
                last_pan_user = user_repository.by_id(last_pan.user_id)
                
                if last_pan_user:
                    # Get the "Last Pan standing" achievement
                    last_pan_achievement = achievement_repository.by_title("Last Pan standing")
                    
                    if last_pan_achievement:
                        # Build evaluation context
                        context = achievement_service._build_evaluation_context(last_pan_user, session)
                        
                        # Get the evaluator
                        from back.src.interactor.achievement_registry import get_registry
                        registry = get_registry()
                        evaluator = registry.get_evaluator(last_pan_achievement)
                        
                        if evaluator and hasattr(evaluator, 'evaluate_for_session_close'):
                            # Evaluate the achievement for session close
                            result = evaluator.evaluate_for_session_close(
                                session_pans, last_pan_user, context
                            )
                            
                            if result.unlocked:
                                # Check if user already has the achievement
                                unlocked_achievement_ids = user_repository.get_unlocked_achievements(last_pan_user.id)
                                if last_pan_achievement.id not in unlocked_achievement_ids:
                                    achievement_service.unlock_achievement(
                                        last_pan_user.id, last_pan_achievement.id
                                    )
                            
                            # Update progress
                            if result.progress is not None:
                                achievement_service.update_progress(
                                    last_pan_user.id, last_pan_achievement.id, result.progress
                                )
        
        db.session.commit()
        return serialize_single(session, "session")
    
    @BaseApi.endpoint("/reactivate", ["POST"])
    @require_auth
    def reactivate_session(self):
        """Reactivate a session.
        
        Request body should contain:
        - key: Session key
        
        :returns RaclottoSession: Reactivated session
        :status_code 200: Session reactivated
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        attributes = deserialize_attributes()
        session_key = attributes.get('key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="key is required"
            )
        
        session = self.repository.reactivate_session(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        db.session.commit()
        return serialize_single(session, "session")
