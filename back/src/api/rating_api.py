from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth
from back.src.repository.rating_repository import RatingRepository
from back.src.api.serializer import serialize_single, serialize_collection
from back.src.api.deserializer import deserialize_attributes
from back.src.driver.database import db
from back.src.entity.rating import Rating


class RatingApi(BaseApi):
    url_prefix = "/ratings"
    
    def __init__(self):
        super().__init__()
        self.repository = RatingRepository()
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_ratings(self):
        """List ratings, optionally filtered by session.
        
        Query parameters:
        - session_key: Optional session key to filter by
        
        :returns List[Rating]: List of ratings
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        session_key = request.args.get('session_key')
        
        if session_key:
            ratings = self.repository.by_session(session_key)
        else:
            ratings = self.repository.all()
        
        return serialize_collection(ratings, "rating")
    
    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_rating(self):
        """Create a new rating.
        
        Query parameters:
        - session_key: Session key (required)
        
        Request body should contain:
        - rating: Rating value
        - pan_id: Pan ID
        - user_id: User ID (optional, will use authenticated user)
        
        :returns Rating: Created rating
        :status_code 201: Rating created successfully
        :status_code 401: Not authenticated
        """
        from back.src.auth.middleware import get_current_user
        from back.src.repository.session_repository import SessionRepository
        
        user = get_current_user()
        attributes = deserialize_attributes()
        
        # Get session_key from query parameter or attributes
        session_key = request.args.get('session_key') or attributes.get('session_key')
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing session_key",
                detail="session_key query parameter is required"
            )
        
        # Convert session_key to session_id
        session_repository = SessionRepository()
        session = session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Use authenticated user's ID if not provided
        if 'user_id' not in attributes:
            attributes['user_id'] = user.id
        
        # Set session_id from the session (required by SessionMixin)
        attributes['session_id'] = session.id
        
        # Remove session_key from attributes if present (we've converted it to session_id)
        attributes.pop('session_key', None)
        
        # Validate required fields
        if 'rating' not in attributes:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="rating is required"
            )
        
        if 'pan_id' not in attributes:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="pan_id is required"
            )
        
        # Create the rating entity directly to ensure it's properly added
        rating = Rating(**attributes)
        db.session.add(rating)
        db.session.flush()  # Get the ID
        
        # Commit the rating to the database
        db.session.commit()
        
        # Refresh to ensure all relationships are loaded
        db.session.refresh(rating)
        
        # Evaluate achievements for this rating (e.g., "Local Guide" achievement)
        from back.src.interactor.achievement_service import AchievementService
        achievement_service = AchievementService()
        achievement_service.evaluate_achievements_for_rating(rating, user)
        db.session.commit()
        
        return serialize_single(rating, "rating")
    
    @BaseApi.endpoint("/<int:rating_id>", ["GET"])
    @require_auth
    def get_rating(self, rating_id: int):
        """Get a rating by ID.
        
        :param rating_id: Rating ID
        :returns Rating: Rating
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Rating not found
        """
        rating = self.repository.by_id(rating_id)
        if not rating:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Rating not found",
                detail="The specified rating does not exist"
            )
        
        return serialize_single(rating, "rating")
    
    @BaseApi.endpoint("/<int:rating_id>", ["PATCH"])
    @require_auth
    def update_rating(self, rating_id: int):
        """Update a rating.
        
        :param rating_id: Rating ID
        :returns Rating: Updated rating
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Rating not found
        """
        rating = self.repository.by_id(rating_id)
        if not rating:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Rating not found",
                detail="The specified rating does not exist"
            )
        
        attributes = deserialize_attributes()
        updated = self.repository.update(rating_id, attributes)
        db.session.commit()
        
        return serialize_single(updated, "rating")
    
    @BaseApi.endpoint("/<int:rating_id>", ["DELETE"])
    @require_auth
    def delete_rating(self, rating_id: int):
        """Delete a rating.
        
        :param rating_id: Rating ID
        :status_code 204: Success
        :status_code 401: Not authenticated
        :status_code 404: Rating not found
        """
        if not self.repository.exists(rating_id):
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Rating not found",
                detail="The specified rating does not exist"
            )
        
        self.repository.delete(rating_id)
        db.session.commit()
        
        return None, 204
