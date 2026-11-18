from back.src.api.base_api import BaseApi
from back.src.auth.middleware import require_auth
from back.src.dto.achievement import LeaderboardEntryDto
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto
from back.src.dto.session import SessionFilterQuery
from back.src.dto.stats import IngredientUsageDto, StatsDto
from back.src.dto.user_stats import IngredientRatingDto
from back.src.repository.achievement_repository import AchievementRepository
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.session_repository import SessionRepository
from back.src.repository.user_repository import UserRepository

_LIMIT = 10


class StatsApi(BaseApi):
    url_prefix = "/stats"

    def __init__(self):
        super().__init__()
        self.pan_repository = PanRepository()
        self.ingredient_repository = IngredientRepository()
        self.session_repository = SessionRepository()
        self.user_repository = UserRepository()
        self.achievement_repository = AchievementRepository()

    @BaseApi.endpoint("", ["GET"], query=SessionFilterQuery, response=StatsDto, operation_id="getStats")
    @require_auth
    def get_stats(self, query: SessionFilterQuery) -> StatsDto:
        """Newest pans, best rated and most used ingredients and the leaderboard, of one session or all."""
        leaderboard = LeaderboardEntryDto.ranking(self.achievement_repository.standings())
        session_id = None
        if query.session_key is not None:
            session = self.session_repository.by_key(query.session_key)
            if not session:
                return StatsDto(pans=[], ingredients_top_rated=[], ingredients_most_used=[], leaderboard=leaderboard)
            session_id = session.id

        pans = self.pan_repository.get_recent_pans(session_key=query.session_key, limit=_LIMIT)
        authors = self.user_repository.by_ids(pan.user_id for pan in pans)
        return StatsDto(
            pans=[PanDto.of(pan, authors.get(pan.user_id)) for pan in pans],
            ingredients_top_rated=[
                IngredientRatingDto(ingredient=IngredientDto.model_validate(ingredient), avg_rating=float(avg or 0))
                for ingredient, avg in self.ingredient_repository.get_top_rated(session_id, limit=_LIMIT)
            ],
            ingredients_most_used=[
                IngredientUsageDto(ingredient=IngredientDto.model_validate(ingredient), pan_count=int(count or 0))
                for ingredient, count in self.ingredient_repository.get_most_used(session_id, limit=_LIMIT)
            ],
            leaderboard=leaderboard,
        )
