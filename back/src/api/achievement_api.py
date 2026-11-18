from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.api.serializer import serialize_single, serialize_collection, serialize_entity
from back.src.api.constants import JSONAPI_VERSION
from back.src.repository import RatingRepository, UserRepository, SessionRepository
from back.src.repository.achievement_repository import AchievementRepository
from back.src.auth.middleware import require_auth, get_current_user
from back.src.interactor.achievements import Achievements
from back.src.driver.database import db
from back.src.entity.user import user_achievements


class AchievementApi(BaseApi):
    url_prefix = "/achievements"
    
    def __init__(self):
        super().__init__()
        self.repository = AchievementRepository()
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
        user = get_current_user()
        enriched_achievements = []
        for status in Achievements().statuses(user):
            achievement_dict = serialize_entity(status.achievement, "achievement")
            achievement_dict["attributes"]["unlocked"] = status.unlocked
            achievement_dict["attributes"]["progress"] = status.progress
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
    
    @BaseApi.endpoint("/leaderboard", ["GET"])
    @require_auth
    def get_leaderboard(self):
        """Get leaderboard of users by achievement points.
        
        :returns List[Dict]: List of users with their total achievement points, sorted by points descending
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        from sqlalchemy import func
        from back.src.entity.user import User
        from back.src.entity.achievement import Achievement
        
        # Get all users with their total achievement points
        # Sum up the value of all achievements each user has unlocked
        # Use a subquery approach to properly handle users with no achievements
        
        # Subquery to calculate points per user
        points_subquery = db.session.query(
            user_achievements.c.user_id,
            func.sum(Achievement.value).label('total_points'),
            func.count(Achievement.id).label('achievement_count')
        ).join(
            Achievement, Achievement.id == user_achievements.c.achievement_id
        ).group_by(
            user_achievements.c.user_id
        ).subquery()
        
        # Main query joining users with their points
        leaderboard_query = db.session.query(
            User.id,
            User.name,
            func.coalesce(points_subquery.c.total_points, 0).label('total_points'),
            func.coalesce(points_subquery.c.achievement_count, 0).label('achievement_count')
        ).outerjoin(
            points_subquery, User.id == points_subquery.c.user_id
        ).order_by(
            func.coalesce(points_subquery.c.total_points, 0).desc(),
            User.name.asc()
        ).all()
        
        # Convert to list of dictionaries
        leaderboard = []
        for rank, (user_id, user_name, total_points, achievement_count) in enumerate(leaderboard_query, start=1):
            leaderboard.append({
                "rank": rank,
                "user_id": user_id,
                "name": user_name,
                "total_points": int(total_points) if total_points else 0,
                "achievement_count": int(achievement_count) if achievement_count else 0
            })
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": leaderboard
        }
