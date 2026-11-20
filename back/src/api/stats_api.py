from back.src.api.base_api import BaseApi
from back.src.auth.middleware import require_auth
from back.src.dto.session import SessionFilterQuery
from back.src.dto.stats import StatsDto
from back.src.interactor.stats import Stats


class StatsApi(BaseApi):
    url_prefix = "/stats"

    @BaseApi.endpoint("", ["GET"], query=SessionFilterQuery, response=StatsDto, operation_id="getStats")
    @require_auth
    def get_stats(self, query: SessionFilterQuery) -> StatsDto:
        """Newest pans, best rated and most used ingredients and the leaderboard, of one session or all."""
        return StatsDto.of(Stats().of(query.session_key))
