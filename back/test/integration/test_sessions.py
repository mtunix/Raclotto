from datetime import datetime

from back.src.driver.database import db
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User, user_sessions
from back.src.interactor.achievements import AchievementChanges, Achievements
from back.src.interactor.facts import Fact, SessionClosed
from back.src.interactor.sessions import Sessions
from back.test.support import AppTest

FRIDAY = datetime(2026, 11, 20, 19, 0)


class Recording(Achievements):
    def __init__(self) -> None:
        super().__init__()
        self.facts: list[Fact] = []

    def record(self, fact: Fact) -> AchievementChanges:
        self.facts.append(fact)
        return AchievementChanges()


class SessionsTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.achievements = Recording()
        self.now = FRIDAY
        self.sessions = Sessions(achievements=self.achievements, clock=lambda: self.now)

    def members(self, session: RaclottoSession) -> list[tuple[int, datetime]]:
        rows = db.session.execute(user_sessions.select().where(user_sessions.c.session_id == session.id)).all()
        return [(row.user_id, row.joined_at) for row in rows]

    def stored(self, session: RaclottoSession) -> RaclottoSession:
        db.session.commit()
        db.session.expire_all()
        return db.session.get_one(RaclottoSession, session.id)

    def test_create_opens_a_session_its_creator_joins(self):
        session = self.sessions.create(self.ana, "Friday")

        self.assertEqual((session.name, session.active, session.created_by_user_id), ("Friday", True, self.ana.id))
        self.assertTrue(session.key)
        self.assertEqual(self.members(session), [(self.ana.id, FRIDAY)])

    def test_a_member_keeps_the_time_they_first_joined(self):
        session = self.sessions.create(self.ana, "Friday")
        self.sessions.join(self.ben, session)
        self.now = datetime(2026, 11, 20, 23, 0)

        self.sessions.join(self.ben, session)
        self.sessions.join(self.ana, session)

        self.assertEqual(self.members(session), [(self.ana.id, FRIDAY), (self.ben.id, FRIDAY)])

    def test_rename(self):
        session = self.make_session("s1", creator=self.ana)

        self.sessions.rename(session, "Saturday")

        self.assertEqual(self.stored(session).name, "Saturday")

    def test_close_reports_the_session_closed_by_its_actor(self):
        session = self.make_session("s1", creator=self.ana)

        self.sessions.close(session, self.ben)

        self.assertFalse(self.stored(session).active)
        self.assertEqual(self.achievements.facts, [SessionClosed(session=session, actor=self.ben)])

    def test_reactivate(self):
        session = self.make_session("s1", creator=self.ana)
        self.sessions.close(session, self.ana)

        self.sessions.reactivate(session)

        self.assertTrue(self.stored(session).active)

    def test_delete(self):
        session = self.make_session("s1", creator=self.ana)

        self.sessions.delete(session)
        db.session.commit()

        self.assertIsNone(db.session.get(RaclottoSession, session.id))

    def test_nothing_is_committed(self):
        session = self.sessions.create(self.ana, "Friday")
        self.sessions.join(self.ben, session)
        db.session.rollback()

        self.assertEqual(db.session.query(RaclottoSession).count(), 0)
        self.assertEqual(db.session.query(User).filter(User.sessions.any()).count(), 0)
