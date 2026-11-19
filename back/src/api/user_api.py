from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import require_auth
from back.src.dto.user import UserProfileDto
from back.src.dto.user_stats import UserStatsDto
from back.src.entity.user import User
from back.src.interactor.levels import Levels
from back.src.interactor.user_stats import user_stats
from back.src.repository.user_repository import UserRepository


class UserApi(BaseApi):
    url_prefix = "/users"

    def __init__(self) -> None:
        super().__init__()
        self.user_repository = UserRepository()

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

    @BaseApi.endpoint("/<int:user_id>", ["GET"], response=UserProfileDto, operation_id="getUserProfile",
                      errors=(404,))
    @require_auth
    def get_user_profile(self, user_id: int) -> UserProfileDto:
        """Get a user's public profile: card, level and achievements."""
        user = self._user(user_id)
        return UserProfileDto.of(user, Levels().progress_of(user))

    @BaseApi.endpoint("/<int:user_id>/stats", ["GET"], response=UserStatsDto, operation_id="getUserStats",
                      errors=(404,))
    @require_auth
    def get_user_stats(self, user_id: int) -> UserStatsDto:
        """Get a user's pan, rating and achievement statistics."""
        user = self._user(user_id)
        return UserStatsDto.of(user_stats(user), user)
