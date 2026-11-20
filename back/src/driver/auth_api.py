from math import ceil

from flask import current_app, request

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.jwt import generate_token
from back.src.auth.middleware import get_current_user, require_auth
from back.src.auth.password import verify_password
from back.src.auth.throttle import login_throttle
from back.src.driver.database import db
from back.src.dto.auth import AuthResultDto, ChangePasswordBody, LoginBody, RegisterBody, TokenDto
from back.src.dto.invite import CreateInviteBody, InviteDto, InviteLookupDto
from back.src.dto.user import MeDto, UpdateMeBody
from back.src.entity.user import User
from back.src.interactor.accounts import AccountError, Accounts
from back.src.interactor.diet import Diet
from back.src.interactor.levels import Levels
from back.src.interactor.profile_pictures import ProfilePictures
from back.src.repository.invite_token_repository import InviteTokenRepository
from back.src.repository.user_repository import UserRepository


def _token(user: User) -> str:
    return generate_token(user.id, current_app.config["JWT_SECRET_KEY"], user.token_version)


def _me(user: User) -> MeDto:
    return MeDto.of(user, Levels().progress_of(user))


def _registration_error(error: AccountError) -> ApiError:
    if error.kind == AccountError.UNKNOWN_INVITE:
        return ApiError(
            ApiErrorCode.invalid_token,
            status=400,
            title="Invalid invite token",
            detail="The provided invite token does not exist",
        )
    if error.kind == AccountError.SPENT_INVITE:
        return ApiError(
            ApiErrorCode.invalid_token,
            status=400,
            title="Invalid invite token",
            detail="The invite token has already been used or has expired",
        )
    if error.kind == AccountError.EMAIL_MISMATCH:
        return ApiError(
            ApiErrorCode.incorrect_parameters,
            status=400,
            title="Email mismatch",
            detail="The provided email does not match the invite token's email",
        )
    return ApiError(
        ApiErrorCode.incorrect_parameters,
        status=400,
        title="User already exists",
        detail="A user with this email or name already exists",
    )


class AuthApi(BaseApi):
    url_prefix = "/auth"

    def __init__(self) -> None:
        super().__init__()
        self.user_repository = UserRepository()

    @BaseApi.endpoint("/register", ["POST"], body=RegisterBody, response=AuthResultDto, operation_id="register")
    def register(self, body: RegisterBody) -> AuthResultDto:
        """Register a new user with an invite token and sign them in."""
        try:
            user = Accounts().register(body.token, body.name, body.email, body.password, body.profile_picture)
        except AccountError as e:
            raise _registration_error(e) from e
        dto = AuthResultDto(token=_token(user), user=_me(user))
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/login", ["POST"], body=LoginBody, response=AuthResultDto, operation_id="login", errors=(401, 429)
    )
    def login(self, body: LoginBody) -> AuthResultDto:
        """Sign in with name or email and password; too many failures from one address pause the account there."""
        throttle = login_throttle()
        key = f"{request.remote_addr}|{body.name_or_email.casefold()}"
        wait = throttle.retry_after(key)
        if wait is not None:
            raise ApiError(
                ApiErrorCode.too_many_requests,
                status=429,
                title="Too many attempts",
                detail=f"Too many failed sign-ins; try again in {ceil(wait.total_seconds() / 60)} minutes",
            )
        user = self.user_repository.by_email_or_name(body.name_or_email)
        if not verify_password(body.password, user.password if user else None) or not user:
            throttle.failed(key)
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Invalid credentials",
                detail="Invalid email/name or password",
            )
        throttle.succeeded(key)
        return AuthResultDto(token=_token(user), user=_me(user))

    @BaseApi.endpoint("/me", ["GET"], response=MeDto, operation_id="getMe")
    @require_auth
    def me(self) -> MeDto:
        """Get the signed-in user."""
        return _me(get_current_user())

    @BaseApi.endpoint(
        "/invite/<string:token>", ["GET"], response=InviteLookupDto, operation_id="lookupInvite", errors=(400,)
    )
    def get_invite(self, token: str) -> InviteLookupDto:
        """Look up an unused invite for the registration page."""
        try:
            invite = Accounts().usable_invite(token)
        except AccountError as e:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=400,
                title="Invalid invite token",
                detail="The invite token does not exist, has been used, or has expired",
            ) from e
        return InviteLookupDto.model_validate(invite)

    @BaseApi.endpoint("/me", ["PATCH"], body=UpdateMeBody, response=MeDto, operation_id="updateMe", errors=(409,))
    @require_auth
    def update_me(self, body: UpdateMeBody) -> MeDto:
        """Change the signed-in user's name, diet, language, picture or card decoration."""
        user = get_current_user()
        for field in body.model_fields_set - {"profile_picture"}:
            setattr(user, field, getattr(body, field))
        Diet.of(user).apply_to(user)

        if "profile_picture" in body.model_fields_set:
            ProfilePictures().add(user, body.profile_picture)

        dto = _me(user)
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/password", ["POST"], body=ChangePasswordBody, response=TokenDto, operation_id="changePassword", errors=(400,)
    )
    @require_auth
    def change_password(self, body: ChangePasswordBody) -> TokenDto:
        """Change the signed-in user's password; every other device is signed out, this one gets a new token."""
        user = get_current_user()
        try:
            Accounts().change_password(user, body.current_password, body.new_password)
        except AccountError as e:
            # 400, not 401: the frontend signs out on a 401.
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Wrong password",
                detail="The current password is wrong",
            ) from e
        dto = TokenDto(token=_token(user))
        db.session.commit()
        return dto

    @BaseApi.endpoint("/refresh", ["POST"], response=TokenDto, operation_id="refreshToken")
    @require_auth
    def refresh(self) -> TokenDto:
        """Issue a new token for the signed-in user."""
        return TokenDto(token=_token(get_current_user()))


class InviteApi(BaseApi):
    url_prefix = "/invites"

    def __init__(self) -> None:
        super().__init__()
        self.invite_token_repository = InviteTokenRepository()

    @BaseApi.endpoint("", ["POST"], body=CreateInviteBody, response=InviteDto, operation_id="createInvite")
    @require_auth
    def create_invite(self, body: CreateInviteBody) -> InviteDto:
        """Invite someone by email; any signed-in user may."""
        valid_days = current_app.config.get("INVITE_TOKEN_EXPIRATION_DAYS", 7)
        invite = Accounts().invite(get_current_user(), body.email, valid_days)
        dto = InviteDto.model_validate(invite)
        db.session.commit()
        return dto

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
        try:
            Accounts().revoke(get_current_user(), invite_id)
        except AccountError as e:
            if e.kind == AccountError.USED_INVITE:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Cannot revoke used token",
                    detail="This invite token has already been used",
                ) from e
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Invite token not found",
                detail="The specified invite token does not exist or you don't have permission to revoke it",
            ) from e
        db.session.commit()
