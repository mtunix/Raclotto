from typing import Dict

from sqlalchemy import func

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import require_auth
from back.src.driver.database import db
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto
from back.src.dto.user import UserProfileDto
from back.src.dto.user_stats import IngredientRatingDto, SessionPanCountDto, UserStatsDto
from back.src.entity.ingredient import Ingredient
from back.src.entity.pan import Pan, pan_ingredients
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.rating import Rating
from back.src.entity.user import User
from back.src.interactor.level_service import LevelService
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository
from back.src.repository.user_repository import UserRepository


class UserApi(BaseApi):
    url_prefix = "/users"

    def __init__(self):
        super().__init__()
        self.user_repository = UserRepository()
        self.pan_repository = PanRepository()
        self.rating_repository = RatingRepository()

    def _user(self, user_id: int) -> User:
        user = self.user_repository.by_id(user_id)
        if not user:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="User not found",
                detail=f"User with ID {user_id} does not exist",
            )
        return user

    @BaseApi.endpoint("/<int:user_id>", ["GET"], response=UserProfileDto, operation_id="getUserProfile")
    @require_auth
    def get_user_profile(self, user_id: int) -> UserProfileDto:
        """Get a user's public profile: card, level and achievements."""
        user = self._user(user_id)
        return UserProfileDto.of(user, LevelService().progress_of(user))

    @BaseApi.endpoint("/<int:user_id>/stats", ["GET"], response=UserStatsDto, operation_id="getUserStats")
    @require_auth
    def get_user_stats(self, user_id: int) -> UserStatsDto:
        """Get a user's pan, rating and achievement statistics."""
        return self._calculate_user_stats(self._user(user_id))

    def _calculate_user_stats(self, user: User) -> UserStatsDto:
        user_pans = self.pan_repository.by_user(user.id)
        total_pans = len(user_pans)
        pan_ids = [pan.id for pan in user_pans]

        average_rating_received = 0.0
        if user_pans:
            avg_rating_result = (
                db.session.query(func.avg(Rating.rating))
                .filter(Rating.pan_id.in_(pan_ids))
                .scalar()
            )
            average_rating_received = float(avg_rating_result) if avg_rating_result else 0.0

        # Most frequently used in the user's pans; the first one counted wins a tie.
        favorite_ingredient = None
        ingredient_counts: Dict[int, int] = {}
        for pan in user_pans:
            for ingredient in pan.ingredients:
                ingredient_counts[ingredient.id] = ingredient_counts.get(ingredient.id, 0) + 1
        if ingredient_counts:
            most_used_id = max(ingredient_counts.items(), key=lambda x: x[1])[0]
            favorite = db.session.query(Ingredient).filter_by(id=most_used_id).first()
            if favorite:
                favorite_ingredient = IngredientDto.model_validate(favorite)

        # Highest average rating over the user's pans it was in.
        best_rated_ingredient = None
        if user_pans:
            ingredient_ratings = (
                db.session.query(
                    pan_ingredients.c.ingredient_id,
                    func.avg(Rating.rating).label("avg_rating"),
                )
                .join(Pan, Pan.id == pan_ingredients.c.pan_id)
                .join(Rating, Rating.pan_id == Pan.id)
                .filter(Pan.id.in_(pan_ids))
                .group_by(pan_ingredients.c.ingredient_id)
                .order_by(func.avg(Rating.rating).desc())
                .first()
            )
            if ingredient_ratings:
                ingredient = db.session.query(Ingredient).filter_by(id=ingredient_ratings[0]).first()
                if ingredient:
                    best_rated_ingredient = IngredientRatingDto(
                        ingredient=IngredientDto.model_validate(ingredient),
                        avg_rating=float(ingredient_ratings[1]) if ingredient_ratings[1] else 0.0,
                    )

        average_ingredients_per_pan = 0.0
        if user_pans:
            average_ingredients_per_pan = sum(len(pan.ingredients) for pan in user_pans) / total_pans

        most_pans_session = None
        session_pan_counts: Dict[int, int] = {}
        for pan in user_pans:
            if pan.session_id:
                session_pan_counts[pan.session_id] = session_pan_counts.get(pan.session_id, 0) + 1
        if session_pan_counts:
            max_session_id = max(session_pan_counts.items(), key=lambda x: x[1])[0]
            session = db.session.query(RaclottoSession).filter_by(id=max_session_id).first()
            if session:
                most_pans_session = SessionPanCountDto(
                    session_id=session.id,
                    session_name=session.name,
                    pan_count=session_pan_counts[max_session_id],
                )

        most_ingredients_pan = None
        if user_pans:
            most_ingredients_pan = PanDto.of(max(user_pans, key=lambda p: len(p.ingredients)), user)

        return UserStatsDto(
            total_pans=total_pans,
            total_ratings_given=self.rating_repository.count_by_user(user.id),
            average_rating_received=round(average_rating_received, 2),
            favorite_ingredient=favorite_ingredient,
            best_rated_ingredient=best_rated_ingredient,
            total_achievement_points=sum(achievement.value for achievement in user.achievements),
            average_ingredients_per_pan=round(average_ingredients_per_pan, 2),
            most_pans_session=most_pans_session,
            sessions_participated=len(session_pan_counts),
            most_ingredients_pan=most_ingredients_pan,
        )
