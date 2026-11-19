"""Permissions: who may change what.

    Permissions(user).manage_session(session)   # rename, close, reactivate, delete
    Permissions(user).change_pan(pan)           # rename, mark eaten, delete
    Permissions(user).change_global()           # global event configs, default preparation types, insults
    Permissions(user).manage_admins()           # see who is an admin
    Permissions(user).change_admin(other)       # grant or revoke admin

A session belongs to its creator and a pan to its author; admins may do all of it. A session
without a creator can only be managed by admins. An admin grants and revokes admin for anyone but
themselves, so whoever revokes stays an admin and the last admin can't be lost. Everything else,
rolling, rating and a session's ingredients and preparation types, is open to every signed-in user.
Each check raises ``Forbidden``; the ``may_*`` twins answer without raising.
"""

from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User


class Forbidden(Exception):
    """The user may not make this change."""


class Permissions:
    def __init__(self, user: User):
        self._user = user

    def may_manage_session(self, session: RaclottoSession) -> bool:
        return self._user.is_admin or session.created_by_user_id == self._user.id

    def may_change_pan(self, pan: Pan) -> bool:
        return self._user.is_admin or pan.user_id == self._user.id

    def may_change_global(self) -> bool:
        return self._user.is_admin

    def may_manage_admins(self) -> bool:
        return self._user.is_admin

    def may_change_admin(self, user: User) -> bool:
        return self._user.is_admin and user.id != self._user.id

    def manage_session(self, session: RaclottoSession) -> None:
        if not self.may_manage_session(session):
            raise Forbidden("Only the session's creator or an admin may change it")

    def change_pan(self, pan: Pan) -> None:
        if not self.may_change_pan(pan):
            raise Forbidden("Only the pan's author or an admin may change it")

    def change_global(self) -> None:
        if not self.may_change_global():
            raise Forbidden("Only an admin may change the global settings")

    def manage_admins(self) -> None:
        if not self.may_manage_admins():
            raise Forbidden("Only an admin may see who is an admin")

    def change_admin(self, user: User) -> None:
        if not self.may_change_admin(user):
            raise Forbidden("Only another admin may grant or revoke a user's admin")
