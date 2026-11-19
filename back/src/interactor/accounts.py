"""Accounts: invite someone, register with an invite, and create users.

    invite = Accounts().invite(creator, email, valid_days=7)
    invite = Accounts().usable_invite(token)
    user = Accounts().register(token, name, email, password, picture)
    Accounts().revoke(creator, invite_id)
    admin = Accounts().create_user(name, email, password, is_admin=True)
    Accounts().change_password(user, current, new)
    Accounts().set_admin(user, is_admin=True)

An invite is usable until it is used or expires, and only for its own email, in any case. Only
its creator can revoke it, until it is used. A new user starts at the lowest level, and their
first picture is the one generation starts from. Callers own the transaction: nothing here
commits. Changing the password bumps the user's token version, which signs out every other
device.
"""

from back.src.auth.password import hash_password, verify_password
from back.src.driver.database import db
from back.src.entity.invite_token import InviteToken
from back.src.entity.user import User
from back.src.interactor.levels import Levels
from back.src.interactor.profile_pictures import ProfilePictures
from back.src.repository.invite_token_repository import InviteTokenRepository
from back.src.repository.user_repository import UserRepository


class AccountError(Exception):
    """No account change. ``kind`` says why."""

    UNKNOWN_INVITE = "unknown_invite"
    # Used or expired.
    SPENT_INVITE = "spent_invite"
    EMAIL_MISMATCH = "email_mismatch"
    TAKEN = "taken"
    # Revoking: someone else's invite is reported as unknown.
    USED_INVITE = "used_invite"
    WRONG_PASSWORD = "wrong_password"

    def __init__(self, kind: str):
        super().__init__(kind)
        self.kind = kind


class Accounts:
    def __init__(self, pictures: ProfilePictures | None = None):
        self._pictures = pictures or ProfilePictures()
        self._invites = InviteTokenRepository()
        self._users = UserRepository()

    def invite(self, creator: User, email: str, valid_days: int) -> InviteToken:
        invite = InviteToken(
            token=InviteToken.generate_token(),
            email=email,
            created_by_user_id=creator.id,
            expires_at=InviteToken.create_expiration_date(valid_days),
        )
        db.session.add(invite)
        db.session.flush()
        return invite

    def usable_invite(self, token: str) -> InviteToken:
        invite = self._invites.by_token(token)
        if invite is None:
            raise AccountError(AccountError.UNKNOWN_INVITE)
        if not invite.is_valid():
            raise AccountError(AccountError.SPENT_INVITE)
        return invite

    def register(self, token: str, name: str, email: str, password: str, picture: str | None) -> User:
        """A new user with ``picture``, if any; the invite is used up."""
        invite = self.usable_invite(token)
        if invite.email.lower() != email.lower():
            raise AccountError(AccountError.EMAIL_MISMATCH)
        user = self.create_user(name, email, password)
        if picture:
            self._pictures.add(user, picture)
        invite.mark_as_used()
        return user

    def revoke(self, creator: User, invite_id: int) -> None:
        invite = self._invites.by_id(invite_id)
        if invite is None or invite.created_by_user_id != creator.id:
            raise AccountError(AccountError.UNKNOWN_INVITE)
        if invite.is_used:
            raise AccountError(AccountError.USED_INVITE)
        db.session.delete(invite)
        db.session.flush()

    def change_password(self, user: User, current: str, new: str) -> None:
        if not verify_password(current, user.password):
            raise AccountError(AccountError.WRONG_PASSWORD)
        user.password = hash_password(new)
        user.token_version += 1
        db.session.flush()

    def set_admin(self, user: User, is_admin: bool) -> None:
        """Whether ``user`` is an admin; who may change it is ``Permissions.change_admin``."""
        user.is_admin = is_admin
        db.session.flush()

    def create_user(self, name: str, email: str, password: str, is_admin: bool = False) -> User:
        if self._users.by_email(email) or self._users.by_name(name):
            raise AccountError(AccountError.TAKEN)
        first_level = Levels().starting()
        user = User(
            name=name,
            email=email,
            password=hash_password(password),
            experience_points=0,
            level_id=first_level.id if first_level else None,
            is_admin=is_admin,
        )
        db.session.add(user)
        db.session.flush()
        return user
