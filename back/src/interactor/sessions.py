"""Sessions: create a session, join, rename, close, reopen and delete it.

    session = Sessions().create(creator, "Friday")
    Sessions().join(user, session)
    Sessions().rename(session, "Saturday")
    Sessions().close(session, actor)
    Sessions().reactivate(session)
    Sessions().delete(session, actor)

Its creator joins a session as it is created, and anyone who rolls there joins on their first pan;
the join time counts for achievements such as "Pandler". Creating reports ``SessionOpened`` and
closing ``SessionClosed``, so the achievements that wait for either are judged with it. Deleting
takes everything in the session along (the cascades on ``RaclottoSession``) and reports
``SessionDeleted``, so the revocable achievements its members held there are judged again; their XP
stays. Who may change a session is ``Permissions.manage_session``; nothing here checks.
Changes are flushed; the endpoint commits the request's transaction (ADR 0008).
"""

from collections.abc import Callable
from datetime import datetime

from back.src.driver.database import db
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User, user_sessions
from back.src.interactor.achievements import Achievements
from back.src.interactor.facts import SessionClosed, SessionDeleted, SessionOpened
from back.src.repository.session_repository import SessionRepository


class Sessions:
    def __init__(self, achievements: Achievements | None = None, clock: Callable[[], datetime] = datetime.now):
        self._achievements = achievements or Achievements()
        self._clock = clock
        self._sessions = SessionRepository()

    def create(self, creator: User, name: str) -> RaclottoSession:
        session = self._sessions.create_with_key(name, creator.id)
        self.join(creator, session)
        self._achievements.record(SessionOpened(session=session, creator=creator))
        return session

    def join(self, user: User, session: RaclottoSession) -> None:
        """Make ``user`` a member of ``session``; a member stays one, with the time they first joined."""
        if not self._is_member(user, session):
            db.session.execute(
                user_sessions.insert().values(user_id=user.id, session_id=session.id, joined_at=self._clock())
            )

    @staticmethod
    def _is_member(user: User, session: RaclottoSession) -> bool:
        membership = (
            db.session.query(user_sessions)
            .filter(user_sessions.c.user_id == user.id, user_sessions.c.session_id == session.id)
            .first()
        )
        return membership is not None

    def rename(self, session: RaclottoSession, name: str) -> None:
        session.name = name
        db.session.flush()

    def close(self, session: RaclottoSession, actor: User) -> None:
        session.active = False
        self._achievements.record(SessionClosed(session=session, actor=actor))

    def reactivate(self, session: RaclottoSession) -> None:
        session.active = True
        db.session.flush()

    def delete(self, session: RaclottoSession, actor: User) -> None:
        fact = SessionDeleted(session=session, members=tuple(session.members), actor=actor)
        db.session.delete(session)
        self._achievements.record(fact)
