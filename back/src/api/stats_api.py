from flask import request
from sqlalchemy import func

from back.src.api.base_api import BaseApi
from back.src.auth.middleware import require_auth
from back.src.driver.database import db
from back.src.entity.achievement import Achievement
from back.src.entity.user import User, user_achievements
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.session_repository import SessionRepository
from back.src.repository.user_repository import UserRepository


class StatsApi(BaseApi):
    url_prefix = "/stats"

    def __init__(self):
        super().__init__()
        self.pan_repository = PanRepository()
        self.ingredient_repository = IngredientRepository()
        self.session_repository = SessionRepository()
        self.user_repository = UserRepository()

    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def get_stats(self):
        """Get statistics for a session.

        Query parameters:
        - session_key: Optional session key to filter by

        :returns Dict: Statistics including pans, top-rated ingredients, most-used ingredients
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        session_key = request.args.get("session_key")

        # Get pans (limited to last 10, ordered by timestamp descending)
        pans = self.pan_repository.get_recent_pans(session_key=session_key, limit=10)

        # Get session if session_key was provided (needed for ingredient stats)
        session_id: int | None = None
        if session_key:
            session = self.session_repository.by_key(session_key)
            if not session:
                return {
                    "pans": [],
                    "ingredients_top_rated": [],
                    "ingredients_most_used": [],
                    "leaderboard": self._get_leaderboard(),
                }
            session_id = session.id  # type: ignore

        # Get top-rated ingredients (by average rating)
        top_rated_results = self.ingredient_repository.get_top_rated(
            session_id, limit=10
        )

        top_rated = []
        for ingredient, avg_rating in top_rated_results:
            ingredient_dict = (
                ingredient.to_dict()
                if hasattr(ingredient, "to_dict")
                else {
                    "id": ingredient.id,
                    "name": ingredient.name,
                    "type": ingredient.type.value
                    if hasattr(ingredient.type, "value")
                    else ingredient.type,
                    "meat": ingredient.meat,
                    "vegetarian": ingredient.vegetarian,
                    "vegan": ingredient.vegan,
                    "gluten": ingredient.gluten,
                    "histamine": ingredient.histamine,
                    "fructose": ingredient.fructose,
                    "lactose": ingredient.lactose,
                    "available": ingredient.available,
                }
            )
            ingredient_dict["avg_rating"] = float(avg_rating) if avg_rating else 0.0
            top_rated.append(ingredient_dict)

        # Get most-used ingredients (by pan count)
        most_used_results = self.ingredient_repository.get_most_used(
            session_id, limit=10
        )

        most_used = []
        for ingredient, pan_count in most_used_results:
            ingredient_dict = (
                ingredient.to_dict()
                if hasattr(ingredient, "to_dict")
                else {
                    "id": ingredient.id,
                    "name": ingredient.name,
                    "type": ingredient.type.value
                    if hasattr(ingredient.type, "value")
                    else ingredient.type,
                    "meat": ingredient.meat,
                    "vegetarian": ingredient.vegetarian,
                    "vegan": ingredient.vegan,
                    "gluten": ingredient.gluten,
                    "histamine": ingredient.histamine,
                    "fructose": ingredient.fructose,
                    "lactose": ingredient.lactose,
                    "available": ingredient.available,
                }
            )
            ingredient_dict["pan_count"] = int(pan_count) if pan_count else 0
            most_used.append(ingredient_dict)

        # Get leaderboard data
        leaderboard = self._get_leaderboard()

        return {
            "pans": [
                pan.as_dict() if hasattr(pan, "as_dict") else pan.to_dict()
                for pan in pans
            ],
            "ingredients_top_rated": top_rated,
            "ingredients_most_used": most_used,
            "leaderboard": leaderboard,
        }

    def _get_leaderboard(self):
        """Get leaderboard of users by achievement points.

        :returns List[Dict]: List of users with their total achievement points, sorted by points descending
        """
        # Subquery to calculate points per user
        points_subquery = (
            db.session.query(
                user_achievements.c.user_id,
                func.sum(Achievement.value).label("total_points"),
                func.count(Achievement.id).label("achievement_count"),
            )
            .join(Achievement, Achievement.id == user_achievements.c.achievement_id)
            .group_by(user_achievements.c.user_id)
            .subquery()
        )

        # Main query joining users with their points
        leaderboard_query = (
            db.session.query(
                User.id,
                User.name,
                func.coalesce(points_subquery.c.total_points, 0).label("total_points"),
                func.coalesce(points_subquery.c.achievement_count, 0).label(
                    "achievement_count"
                ),
            )
            .outerjoin(points_subquery, User.id == points_subquery.c.user_id)
            .order_by(
                func.coalesce(points_subquery.c.total_points, 0).desc(), User.name.asc()
            )
            .all()
        )

        # Convert to list of dictionaries
        leaderboard = []
        for rank, (user_id, user_name, total_points, achievement_count) in enumerate(
            leaderboard_query, start=1
        ):
            leaderboard.append(
                {
                    "rank": rank,
                    "user_id": user_id,
                    "name": user_name,
                    "total_points": int(total_points) if total_points else 0,
                    "achievement_count": int(achievement_count)
                    if achievement_count
                    else 0,
                }
            )

        return leaderboard
