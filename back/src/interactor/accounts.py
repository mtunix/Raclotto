"""Accounts: invite someone, register with an invite, join a session as a guest, and create users.

    invite = Accounts().invite(creator, valid_days=7)
    invite = Accounts().usable_invite(token)
    user = Accounts().register(token, name, email, password, picture)
    user, session = Accounts().join_as_guest(join_code, name, picture)
    Accounts().claim(guest, password, email)
    user = Accounts().sign_in(name_or_email, password)
    Accounts().revoke(creator, invite_id)
    admin = Accounts().create_user(name, email, password, is_admin=True)
    Accounts().update_profile(user, {"name": "Ana", "vegan": True, "profile_picture": None})
    Accounts().change_password(user, current, new)
    Accounts().set_admin(user, is_admin=True)

An invite is usable by whoever has its link until it is used or expires. Only its creator can
revoke it, until it is used. A session's join code makes anyone a guest member of that session
while it is active: an account without a password, so it can't sign in again until its owner
claims it by setting one. A new user starts at the lowest level, and their
first picture is the one generation starts from. A profile change keeps the diet normalized and
puts a new picture into the history. The endpoint commits the request's transaction (ADR 0008).
Changing the password bumps the user's token version, which signs out every other device.
"""

from typing import Any

from back.src.auth.password import hash_password, verify_password
from back.src.driver.database import db
from back.src.entity.invite_token import InviteToken
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.diet import Diet
from back.src.interactor.levels import Levels
from back.src.interactor.profile_pictures import ProfilePictures
from back.src.interactor.sessions import Sessions
from back.src.repository.invite_token_repository import InviteTokenRepository
from back.src.repository.session_repository import SessionRepository
from back.src.repository.user_repository import UserRepository


class AccountError(Exception):
    """No account change. ``kind`` says why."""

    UNKNOWN_INVITE = "unknown_invite"
    # Used or expired.
    SPENT_INVITE = "spent_invite"
    UNKNOWN_JOIN_CODE = "unknown_join_code"
    CLOSED_SESSION = "closed_session"
    # Claiming an account that has a password already.
    NOT_A_GUEST = "not_a_guest"
    TAKEN = "taken"
    # Revoking: someone else's invite is reported as unknown.
    USED_INVITE = "used_invite"
    WRONG_PASSWORD = "wrong_password"
    # Signing in: an unknown account and a wrong password alike.
    BAD_CREDENTIALS = "bad_credentials"

    def __init__(self, kind: str):
        super().__init__(kind)
        self.kind = kind


class Accounts:
    def __init__(self, pictures: ProfilePictures | None = None, sessions: Sessions | None = None):
        self._pictures = pictures or ProfilePictures()
        self._sessions = sessions or Sessions()
        self._invites = InviteTokenRepository()
        self._session_records = SessionRepository()
        self._users = UserRepository()

    def invite(self, creator: User, valid_days: int) -> InviteToken:
        invite = InviteToken(
            token=InviteToken.generate_token(),
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

    def register(self, token: str, name: str, email: str | None, password: str, picture: str | None) -> User:
        """A new user with ``picture``, if any; the invite is used up."""
        invite = self.usable_invite(token)
        user = self.create_user(name, email, password)
        if picture:
            self._pictures.add(user, picture)
        invite.mark_as_used()
        return user

    def joinable_session(self, join_code: str) -> RaclottoSession:
        """The session ``join_code`` opens, whether or not it is still active."""
        session = self._session_records.by_join_code(join_code)
        if session is None:
            raise AccountError(AccountError.UNKNOWN_JOIN_CODE)
        return session

    def join_as_guest(self, join_code: str, name: str, picture: str | None) -> tuple[User, RaclottoSession]:
        """A new guest, already a member of the active session ``join_code`` opens."""
        session = self.joinable_session(join_code)
        if not session.active:
            raise AccountError(AccountError.CLOSED_SESSION)
        user = self.create_user(name, None, None)
        if picture:
            self._pictures.add(user, picture)
        self._sessions.join(user, session)
        return user, session

    def claim(self, user: User, password: str, email: str | None) -> None:
        """Keep a guest's account: with a password (and an email, if given) it can sign in again."""
        if user.password is not None:
            raise AccountError(AccountError.NOT_A_GUEST)
        if email and self._users.by_email(email):
            raise AccountError(AccountError.TAKEN)
        user.password = hash_password(password)
        user.email = email or None
        db.session.flush()

    def sign_in(self, name_or_email: str, password: str) -> User:
        """The account named by its name or email, if ``password`` is its; an unknown one takes as long to refuse."""
        user = self._users.by_email_or_name(name_or_email)
        if not verify_password(password, user.password if user else None) or user is None:
            raise AccountError(AccountError.BAD_CREDENTIALS)
        return user

    def revoke(self, creator: User, invite_id: int) -> None:
        invite = self._invites.by_id(invite_id)
        if invite is None or invite.created_by_user_id != creator.id:
            raise AccountError(AccountError.UNKNOWN_INVITE)
        if invite.is_used:
            raise AccountError(AccountError.USED_INVITE)
        db.session.delete(invite)
        db.session.flush()

    def update_profile(self, user: User, changes: dict[str, Any]) -> None:
        """Set the given profile fields; a ``profile_picture`` among them, None included, replaces the picture."""
        for field, value in changes.items():
            if field != "profile_picture":
                setattr(user, field, value)
        Diet.of(user).apply_to(user)
        if "profile_picture" in changes:
            self._pictures.add(user, changes["profile_picture"])
        db.session.flush()

    def change_password(self, user: User, current: str, new: str) -> None:
        # A guest has no password to change; claiming the account sets the first one.
        if not verify_password(current, user.password):
            raise AccountError(AccountError.WRONG_PASSWORD)
        user.password = hash_password(new)
        user.token_version += 1
        db.session.flush()

    def set_admin(self, user: User, is_admin: bool) -> None:
        """Whether ``user`` is an admin; who may change it is ``Permissions.change_admin``."""
        user.is_admin = is_admin
        db.session.flush()

    def create_user(self, name: str, email: str | None, password: str | None, is_admin: bool = False) -> User:
        """A new user; without a password, a guest."""
        if (email and self._users.by_email(email)) or self._users.by_name(name):
            raise AccountError(AccountError.TAKEN)
        first_level = Levels().starting()
        user = User(
            name=name,
            email=email or None,
            password=hash_password(password) if password is not None else None,
            experience_points=0,
            level_id=first_level.id if first_level else None,
            is_admin=is_admin,
        )
        db.session.add(user)
        db.session.flush()
        return user
