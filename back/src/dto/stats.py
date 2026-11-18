from back.src.dto.achievement import LeaderboardEntryDto
from back.src.dto.base import ResponseDto
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto
from back.src.dto.user_stats import IngredientRatingDto


class IngredientUsageDto(ResponseDto):
    ingredient: IngredientDto
    # Pans the ingredient was in.
    pan_count: int


class StatsDto(ResponseDto):
    """The dashboard: of one session, or of all sessions; the leaderboard is always global."""

    # The ten newest.
    pans: list[PanDto]
    # The ten best and the ten most used, best first.
    ingredients_top_rated: list[IngredientRatingDto]
    ingredients_most_used: list[IngredientUsageDto]
    leaderboard: list[LeaderboardEntryDto]
