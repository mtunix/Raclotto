from flask import current_app

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.jwt import generate_token
from back.src.auth.middleware import get_current_user, require_auth
from back.src.auth.password import hash_password, verify_password
from back.src.driver.database import db
from back.src.dto.auth import AuthResultDto, LoginBody, RegisterBody, TokenDto
from back.src.dto.invite import CreateInviteBody, InviteDto, InviteLookupDto
from back.src.dto.user import MeDto, UpdateMeBody
from back.src.entity.invite_token import InviteToken
from back.src.entity.user import User
from back.src.interactor.diet import Diet
from back.src.interactor.level_service import LevelService
from back.src.repository.invite_token_repository import InviteTokenRepository
from back.src.repository.level_repository import LevelRepository
from back.src.repository.profile_picture_history_repository import (
    ProfilePictureHistoryRepository,
)
from back.src.repository.user_repository import UserRepository


def _token(user: User) -> str:
    return generate_token(user.id, current_app.config.get("JWT_SECRET_KEY"))


def _me(user: User) -> MeDto:
    return MeDto.of(user, LevelService().progress_of(user))


class AuthApi(BaseApi):
    url_prefix = "/auth"

    def __init__(self):
        super().__init__()
        self.user_repository = UserRepository()
        self.invite_token_repository = InviteTokenRepository()

    @BaseApi.endpoint("/register", ["POST"], body=RegisterBody, response=AuthResultDto, operation_id="register")
    def register(self, body: RegisterBody) -> AuthResultDto:
        """Register a new user with an invite token and sign them in."""
        invite_token = self.invite_token_repository.by_token(body.token)
        if not invite_token:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The provided invite token does not exist",
            )

        if not invite_token.is_valid():
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The invite token has already been used or has expired",
            )

        if invite_token.email.lower() != body.email.lower():
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Email mismatch",
                detail="The provided email does not match the invite token's email",
            )

        if self.user_repository.by_email(body.email) or self.user_repository.by_name(body.name):
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="User already exists",
                detail="A user with this email or name already exists",
            )

        first_level = next(iter(LevelRepository().all_ordered()), None)
        user = User(
            name=body.name,
            email=body.email,
            password=hash_password(body.password),
            experience_points=0,
            level_id=first_level.id if first_level else None,
        )
        db.session.add(user)
        db.session.flush()

        if body.profile_picture:
            ProfilePictureHistoryRepository().add_profile_picture(
                user_id=user.id,
                profile_picture_url=body.profile_picture,
                level_id=first_level.id if first_level else None,
            )

        invite_token.mark_as_used()
        db.session.commit()

        return AuthResultDto(token=_token(user), user=_me(user))

    @BaseApi.endpoint("/login", ["POST"], body=LoginBody, response=AuthResultDto, operation_id="login",
                      errors=(401,))
    def login(self, body: LoginBody) -> AuthResultDto:
        """Sign in with name or email and password."""
        user = self.user_repository.by_email_or_name(body.name_or_email)
        if not user or not verify_password(body.password, user.password):
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Invalid credentials",
                detail="Invalid email/name or password",
            )
        return AuthResultDto(token=_token(user), user=_me(user))

    @BaseApi.endpoint("/me", ["GET"], response=MeDto, operation_id="getMe")
    @require_auth
    def me(self) -> MeDto:
        """Get the signed-in user."""
        return _me(get_current_user())

    @BaseApi.endpoint("/invite/<string:token>", ["GET"], response=InviteLookupDto, operation_id="lookupInvite",
                      errors=(400,))
    def get_invite(self, token: str) -> InviteLookupDto:
        """Look up an unused invite for the registration page."""
        invite_token = self.invite_token_repository.by_token(token)
        if not invite_token or not invite_token.is_valid():
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The invite token does not exist, has been used, or has expired",
            )
        return InviteLookupDto.model_validate(invite_token)

    @BaseApi.endpoint("/me", ["PATCH"], body=UpdateMeBody, response=MeDto, operation_id="updateMe",
                      errors=(409,))
    @require_auth
    def update_me(self, body: UpdateMeBody) -> MeDto:
        """Change the signed-in user's name, diet, language, picture or card decoration."""
        user = get_current_user()
        for field in body.model_fields_set - {"profile_picture"}:
            setattr(user, field, getattr(body, field))
        Diet.of(user).apply_to(user)

        if "profile_picture" in body.model_fields_set:
            # This commits, so it runs after the other changes: a rejected one rolls back both.
            ProfilePictureHistoryRepository().add_profile_picture(
                user_id=user.id,
                profile_picture_url=body.profile_picture,
                level_id=user.level_id,
            )

        db.session.commit()
        return _me(user)

    @BaseApi.endpoint("/refresh", ["POST"], response=TokenDto, operation_id="refreshToken")
    @require_auth
    def refresh(self) -> TokenDto:
        """Issue a new token for the signed-in user."""
        return TokenDto(token=_token(get_current_user()))


class InviteApi(BaseApi):
    url_prefix = "/invites"

    def __init__(self):
        super().__init__()
        self.invite_token_repository = InviteTokenRepository()

    @BaseApi.endpoint("", ["POST"], body=CreateInviteBody, response=InviteDto, operation_id="createInvite")
    @require_auth
    def create_invite(self, body: CreateInviteBody) -> InviteDto:
        """Invite someone by email; any signed-in user may."""
        expiration_days = current_app.config.get("INVITE_TOKEN_EXPIRATION_DAYS", 7)
        invite_token = InviteToken(
            token=InviteToken.generate_token(),
            email=body.email,
            created_by_user_id=get_current_user().id,
            expires_at=InviteToken.create_expiration_date(expiration_days),
        )
        db.session.add(invite_token)
        db.session.commit()
        return InviteDto.model_validate(invite_token)

    @BaseApi.endpoint("", ["GET"], response=list[InviteDto], operation_id="listInvites")
    @require_auth
    def list_invites(self) -> list[InviteDto]:
        """List the invites the signed-in user created, newest first."""
        invites = self.invite_token_repository.by_creator(get_current_user().id)
        return [InviteDto.model_validate(invite) for invite in invites]

    @BaseApi.endpoint("/<int:invite_id>", ["DELETE"], status=204, operation_id="revokeInvite", errors=(400, 404))
    @require_auth
    def revoke_invite(self, invite_id: int) -> None:
        """Revoke an unused invite the signed-in user created."""
        invite = self.invite_token_repository.by_id(invite_id)
        # Someone else's invite is reported as missing.
        if invite and invite.created_by_user_id != get_current_user().id:
            invite = None

        if not invite:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Invite token not found",
                detail="The specified invite token does not exist or you don't have permission to revoke it",
            )

        if invite.is_used:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Cannot revoke used token",
                detail="This invite token has already been used",
            )

        db.session.delete(invite)
        db.session.commit()
