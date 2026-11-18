from back.src.dto.base import ResponseDto
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto


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
