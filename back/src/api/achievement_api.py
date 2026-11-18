from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import get_current_user, require_auth
from back.src.dto.achievement import AchievementDto, AchievementStatusDto, LeaderboardEntryDto
from back.src.interactor.achievements import Achievements
from back.src.repository.achievement_repository import AchievementRepository


class AchievementApi(BaseApi):
    url_prefix = "/achievements"

    def __init__(self) -> None:
        super().__init__()
        self.repository = AchievementRepository()

    @BaseApi.endpoint("", ["GET"], response=list[AchievementStatusDto], operation_id="listAchievements")
    @require_auth
    def list_achievements(self) -> list[AchievementStatusDto]:
        """List every achievement with the signed-in user's unlocked flag and progress."""
        return [AchievementStatusDto.of(status) for status in Achievements().statuses(get_current_user())]

    @BaseApi.endpoint("/<int:achievement_id>", ["GET"], response=AchievementDto, operation_id="getAchievement",
                      errors=(404,))
    @require_auth
    def get_achievement(self, achievement_id: int) -> AchievementDto:
        """Get an achievement by id."""
        achievement = self.repository.by_id(achievement_id)
        if not achievement:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Achievement not found",
                detail="The specified achievement does not exist"
            )
        return AchievementDto.model_validate(achievement)

    @BaseApi.endpoint("/leaderboard", ["GET"], response=list[LeaderboardEntryDto], operation_id="getLeaderboard")
    @require_auth
    def get_leaderboard(self) -> list[LeaderboardEntryDto]:
        """Rank every user by the points of their achievements."""
        return LeaderboardEntryDto.ranking(self.repository.standings())
