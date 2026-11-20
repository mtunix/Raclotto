"""Permissions: who may change what.

    Permissions(user).manage_session(session)   # rename, close, reactivate, delete
    Permissions(user).rename_pan(pan)
    Permissions(user).delete_pan(pan)
    Permissions(user).change_global()           # global event configs, default preparation types
    Permissions(user).invite()                  # issue an invite
    Permissions(user).manage_admins()           # see who is an admin
    Permissions(user).change_admin(other)       # grant or revoke admin

A session belongs to its creator and a pan to its author; admins may do all of it, except delete
someone else's pan, which takes its ratings with it. A session without a creator can only be
managed by admins. An admin grants and revokes admin for anyone but themselves, so whoever revokes
stays an admin and the last admin can't be lost. A guest may not
invite anyone until they claim their account. Everything else, rolling, rating and a session's
ingredients and preparation types, is open to every signed-in user.
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

    def may_rename_pan(self, pan: Pan) -> bool:
        return self._user.is_admin or pan.user_id == self._user.id

    def may_delete_pan(self, pan: Pan) -> bool:
        return pan.user_id == self._user.id

    def may_change_global(self) -> bool:
        return self._user.is_admin

    def may_invite(self) -> bool:
        return self._user.password is not None

    def may_manage_admins(self) -> bool:
        return self._user.is_admin

    def may_change_admin(self, user: User) -> bool:
        return self._user.is_admin and user.id != self._user.id

    def manage_session(self, session: RaclottoSession) -> None:
        if not self.may_manage_session(session):
            raise Forbidden("Only the session's creator or an admin may change it")

    def rename_pan(self, pan: Pan) -> None:
        if not self.may_rename_pan(pan):
            raise Forbidden("Only the pan's author or an admin may rename it")

    def delete_pan(self, pan: Pan) -> None:
        if not self.may_delete_pan(pan):
            raise Forbidden("Only the pan's author may delete it")

    def change_global(self) -> None:
        if not self.may_change_global():
            raise Forbidden("Only an admin may change the global settings")

    def invite(self) -> None:
        if not self.may_invite():
            raise Forbidden("A guest may invite no one until they keep their account")

    def manage_admins(self) -> None:
        if not self.may_manage_admins():
            raise Forbidden("Only an admin may see who is an admin")

    def change_admin(self, user: User) -> None:
        if not self.may_change_admin(user):
            raise Forbidden("Only another admin may grant or revoke a user's admin")
