from flask import current_app

from back.src.api.base_api import ApiErrorCode, BaseApi, ErrorSpec
from back.src.auth.middleware import get_current_user, require_auth
from back.src.dto.invite import CreateInviteBody, InviteDto
from back.src.interactor.accounts import AccountError, Accounts
from back.src.repository.invite_token_repository import InviteTokenRepository

_REVOKE_ERRORS = {
    AccountError.USED_INVITE: ErrorSpec(
        ApiErrorCode.incorrect_parameters, 400, "Cannot revoke used token", "This invite token has already been used"
    ),
    AccountError.UNKNOWN_INVITE: ErrorSpec(
        ApiErrorCode.resource_not_found,
        404,
        "Invite token not found",
        "The specified invite token does not exist or you don't have permission to revoke it",
    ),
}


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
        return InviteDto.model_validate(invite)

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
            raise _REVOKE_ERRORS[e.kind].error() from e
