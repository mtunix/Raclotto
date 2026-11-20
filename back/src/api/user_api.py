from back.src.api.base_api import BaseApi, found
from back.src.api.guard import guarded, permissions
from back.src.auth.middleware import require_auth
from back.src.driver.database import db
from back.src.dto.user import UpdateUserBody, UserAccountDto, UserProfileDto
from back.src.dto.user_stats import UserStatsDto
from back.src.entity.user import User
from back.src.interactor.accounts import Accounts
from back.src.interactor.levels import Levels
from back.src.interactor.user_stats import user_stats
from back.src.repository.user_repository import UserRepository


class UserApi(BaseApi):
    url_prefix = "/users"

    def __init__(self) -> None:
        super().__init__()
        self.user_repository = UserRepository()

    def _user(self, user_id: int) -> User:
        return found(self.user_repository.by_id(user_id), "User")

    @BaseApi.endpoint("", ["GET"], response=list[UserAccountDto], operation_id="listUsers", errors=(403,))
    @require_auth
    def list_users(self) -> list[UserAccountDto]:
        """List every user with their admin rights, by name; admins only."""
        with guarded():
            permissions().manage_admins()
        return [UserAccountDto.of(user) for user in self.user_repository.all_by_name()]

    @BaseApi.endpoint(
        "/<int:user_id>",
        ["PATCH"],
        body=UpdateUserBody,
        response=UserAccountDto,
        operation_id="updateUser",
        errors=(403, 404),
    )
    @require_auth
    def update_user(self, user_id: int, body: UpdateUserBody) -> UserAccountDto:
        """Grant or revoke another user's admin; admins only, and never their own."""
        user = self._user(user_id)
        with guarded():
            permissions().change_admin(user)
        Accounts().set_admin(user, body.is_admin)
        dto = UserAccountDto.of(user)
        db.session.commit()
        return dto

    @BaseApi.endpoint("/<int:user_id>", ["GET"], response=UserProfileDto, operation_id="getUserProfile", errors=(404,))
    @require_auth
    def get_user_profile(self, user_id: int) -> UserProfileDto:
        """Get a user's public profile: card, level and achievements."""
        user = self._user(user_id)
        return UserProfileDto.of(user, Levels().progress_of(user))

    @BaseApi.endpoint(
        "/<int:user_id>/stats", ["GET"], response=UserStatsDto, operation_id="getUserStats", errors=(404,)
    )
    @require_auth
    def get_user_stats(self, user_id: int) -> UserStatsDto:
        """Get a user's pan, rating and achievement statistics."""
        user = self._user(user_id)
        return UserStatsDto.of(user_stats(user), user)
