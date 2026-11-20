from back.src.dto.achievement import LeaderboardEntryDto
from back.src.dto.base import ResponseDto
from back.src.dto.event import EventDto
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto
from back.src.dto.user_stats import IngredientRatingDto
from back.src.interactor.stats import Dashboard


class IngredientUsageDto(ResponseDto):
    ingredient: IngredientDto
    # Pans the ingredient was in.
    pan_count: int


class StatsDto(ResponseDto):
    """The dashboard: of one session, or of all sessions; the leaderboard is always global."""

    # The newest: thirty of a session, ten of all.
    pans: list[PanDto]
    # The ten best and the ten most used, best first.
    ingredients_top_rated: list[IngredientRatingDto]
    ingredients_most_used: list[IngredientUsageDto]
    leaderboard: list[LeaderboardEntryDto]
    # A session's twenty newest events, whoever dismissed them; empty for all sessions.
    events: list[EventDto]

    @classmethod
    def of(cls, dashboard: Dashboard) -> StatsDto:
        return cls(
            pans=[PanDto.of(pan, dashboard.authors.get(pan.user_id)) for pan in dashboard.pans],
            ingredients_top_rated=[
                IngredientRatingDto(ingredient=IngredientDto.model_validate(ingredient), avg_rating=average)
                for ingredient, average in dashboard.top_rated
            ],
            ingredients_most_used=[
                IngredientUsageDto(ingredient=IngredientDto.model_validate(ingredient), pan_count=count)
                for ingredient, count in dashboard.most_used
            ],
            leaderboard=LeaderboardEntryDto.ranking(dashboard.standings),
            events=[EventDto.model_validate(event) for event in dashboard.events],
        )
