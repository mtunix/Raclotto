from back.src.dto.base import ResponseDto
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto
from back.src.entity.user import User
from back.src.interactor.user_stats import UserStats


class IngredientRatingDto(ResponseDto):
    ingredient: IngredientDto
    # Average rating of the pans the ingredient was in.
    avg_rating: float


class SessionPanCountDto(ResponseDto):
    session_id: int
    session_name: str
    pan_count: int


class UserStatsDto(ResponseDto):
    total_pans: int
    total_ratings_given: int
    # Rounded to two decimals, as are the other averages; 0 without ratings.
    average_rating_received: float
    # Null while the user's pans have no ingredients.
    favorite_ingredient: IngredientDto | None
    # Null while none of the user's pans is rated.
    best_rated_ingredient: IngredientRatingDto | None
    total_achievement_points: int
    average_ingredients_per_pan: float
    # Null without pans.
    most_pans_session: SessionPanCountDto | None
    sessions_participated: int
    # Null without pans.
    most_ingredients_pan: PanDto | None

    @classmethod
    def of(cls, stats: UserStats, user: User) -> "UserStatsDto":
        best = stats.best_rated_ingredient
        most = stats.most_pans_session
        return cls(
            total_pans=stats.total_pans,
            total_ratings_given=stats.total_ratings_given,
            average_rating_received=stats.average_rating_received,
            favorite_ingredient=IngredientDto.model_validate(stats.favorite_ingredient)
            if stats.favorite_ingredient else None,
            best_rated_ingredient=IngredientRatingDto(ingredient=IngredientDto.model_validate(best[0]), avg_rating=best[1])
            if best else None,
            total_achievement_points=stats.total_achievement_points,
            average_ingredients_per_pan=stats.average_ingredients_per_pan,
            most_pans_session=SessionPanCountDto(session_id=most[0].id, session_name=most[0].name, pan_count=most[1])
            if most else None,
            sessions_participated=stats.sessions_participated,
            most_ingredients_pan=PanDto.of(stats.most_ingredients_pan, user) if stats.most_ingredients_pan else None,
        )
