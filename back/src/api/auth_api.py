from math import ceil

from flask import current_app, request

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi, ErrorSpec
from back.src.auth.jwt import generate_token
from back.src.auth.middleware import get_current_user, require_auth
from back.src.auth.throttle import login_throttle
from back.src.dto.auth import AuthResultDto, ChangePasswordBody, LoginBody, RegisterBody, TokenDto
from back.src.dto.invite import InviteLookupDto
from back.src.dto.user import MeDto, UpdateMeBody
from back.src.entity.user import User
from back.src.interactor.accounts import AccountError, Accounts
from back.src.interactor.levels import Levels


def _token(user: User) -> str:
    return generate_token(user.id, current_app.config["JWT_SECRET_KEY"], user.token_version)


def _me(user: User) -> MeDto:
    return MeDto.of(user, Levels().progress_of(user))


def _refuse_if_paused(key: str, attempts: str) -> None:
    wait = login_throttle().retry_after(key)
    if wait is not None:
        raise ApiError(
            ApiErrorCode.too_many_requests,
            status=429,
            title="Too many attempts",
            detail=f"Too many failed {attempts}; try again in {ceil(wait.total_seconds() / 60)} minutes",
        )


def _invite_key() -> str:
    # Per address alone: whoever guesses tokens tries many of them.
    return f"invite|{request.remote_addr}"


# What a token guess runs into; a taken name is not one.
_INVITE_GUESSES = {AccountError.UNKNOWN_INVITE, AccountError.SPENT_INVITE, AccountError.EMAIL_MISMATCH}
_INVALID_INVITE = "Invalid invite token"
_REGISTRATION_ERRORS = {
    AccountError.UNKNOWN_INVITE: ErrorSpec(
        ApiErrorCode.invalid_token, 400, _INVALID_INVITE, "The provided invite token does not exist"
    ),
    AccountError.SPENT_INVITE: ErrorSpec(
        ApiErrorCode.invalid_token, 400, _INVALID_INVITE, "The invite token has already been used or has expired"
    ),
    AccountError.EMAIL_MISMATCH: ErrorSpec(
        ApiErrorCode.incorrect_parameters,
        400,
        "Email mismatch",
        "The provided email does not match the invite token's email",
    ),
    AccountError.TAKEN: ErrorSpec(
        ApiErrorCode.incorrect_parameters, 400, "User already exists", "A user with this email or name already exists"
    ),
}


class AuthApi(BaseApi):
    url_prefix = "/auth"

    @BaseApi.endpoint(
        "/register", ["POST"], body=RegisterBody, response=AuthResultDto, operation_id="register", errors=(429,)
    )
    def register(self, body: RegisterBody) -> AuthResultDto:
        """Register a new user with an invite token and sign them in; too many wrong tokens pause the address."""
        _refuse_if_paused(_invite_key(), "invite tokens")
        try:
            user = Accounts().register(body.token, body.name, body.email, body.password, body.profile_picture)
        except AccountError as e:
            if e.kind in _INVITE_GUESSES:
                login_throttle().failed(_invite_key())
            raise _REGISTRATION_ERRORS[e.kind].error() from e
        return AuthResultDto(token=_token(user), user=_me(user))

    @BaseApi.endpoint(
        "/login", ["POST"], body=LoginBody, response=AuthResultDto, operation_id="login", errors=(401, 429)
    )
    def login(self, body: LoginBody) -> AuthResultDto:
        """Sign in with name or email and password; too many failures from one address pause the account there."""
        throttle = login_throttle()
        key = f"{request.remote_addr}|{body.name_or_email.casefold()}"
        _refuse_if_paused(key, "sign-ins")
        try:
            user = Accounts().sign_in(body.name_or_email, body.password)
        except AccountError as e:
            throttle.failed(key)
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Invalid credentials",
                detail="Invalid email/name or password",
            ) from e
        throttle.succeeded(key)
        return AuthResultDto(token=_token(user), user=_me(user))

    @BaseApi.endpoint("/me", ["GET"], response=MeDto, operation_id="getMe")
    @require_auth
    def me(self) -> MeDto:
        """Get the signed-in user."""
        return _me(get_current_user())

    @BaseApi.endpoint(
        "/invite/<string:token>", ["GET"], response=InviteLookupDto, operation_id="lookupInvite", errors=(400, 429)
    )
    def get_invite(self, token: str) -> InviteLookupDto:
        """Look up an unused invite for the registration page; too many wrong tokens pause the address."""
        _refuse_if_paused(_invite_key(), "invite tokens")
        try:
            invite = Accounts().usable_invite(token)
        except AccountError as e:
            login_throttle().failed(_invite_key())
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
        Accounts().update_profile(user, body.model_dump(include=body.model_fields_set))
        return _me(user)

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
        return TokenDto(token=_token(user))

    @BaseApi.endpoint("/refresh", ["POST"], response=TokenDto, operation_id="refreshToken")
    @require_auth
    def refresh(self) -> TokenDto:
        """Issue a new token for the signed-in user."""
        return TokenDto(token=_token(get_current_user()))
