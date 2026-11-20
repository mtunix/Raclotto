import random
from datetime import datetime

from back.src.driver.database import db
from back.src.entity.achievement import Achievement, AchievementKey
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User, user_sessions
from back.src.interactor.achievements import AchievementChanges, Achievements
from back.src.interactor.facts import Fact, SessionClosed, SessionDeleted, SessionOpened
from back.src.interactor.pan_roll import PanRoll, RollOptions
from back.src.interactor.sessions import Sessions
from back.src.repository.user_achievement_progress_repository import UserAchievementProgressRepository
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
        self.assertEqual(self.achievements.facts, [SessionOpened(session=session, creator=self.ana)])

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

    def test_delete_reports_the_session_its_members_and_actor(self):
        session = self.sessions.create(self.ana, "Friday")
        self.sessions.join(self.ben, session)

        self.sessions.delete(session, self.ben)
        db.session.commit()

        self.assertIsNone(db.session.get(RaclottoSession, session.id))
        self.assertEqual(
            self.achievements.facts[-1], SessionDeleted(session=session, members=(self.ana, self.ben), actor=self.ben)
        )

    def test_nothing_is_committed(self):
        session = self.sessions.create(self.ana, "Friday")
        self.sessions.join(self.ben, session)
        db.session.rollback()

        self.assertEqual(db.session.query(RaclottoSession).count(), 0)
        self.assertEqual(db.session.query(User).filter(User.sessions.any()).count(), 0)


class SessionDeletionAchievementsTest(AppTest):
    """A deleted session's members are judged again where they were last; with no session left, nowhere."""

    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.ben = self.make_user("ben", meat=True)
        self.doomed = self.make_session("doomed", creator=self.ana)
        self.kept = self.make_session("kept", creator=self.ben)
        self.roll = PanRoll(rng=random.Random(7), name_pan=lambda: "p")

    def roll_pan(self, user: User, session: RaclottoSession, *ingredients: Ingredient) -> None:
        self.roll.roll(user, session.key, RollOptions(ingredient_ids=[i.id for i in ingredients]))
        db.session.commit()

    def delete(self, session: RaclottoSession) -> None:
        Sessions().delete(session, self.ana)
        db.session.commit()

    def standing(self, user: User, key: AchievementKey) -> tuple[bool, float | None]:
        db.session.expire_all()
        achievement = db.session.query(Achievement).filter_by(key=key).one()
        progress = UserAchievementProgressRepository().by_user_and_achievement(user.id, achievement.id)
        return achievement in user.achievements, progress.progress_value if progress else None

    def test_king_of_the_grill_is_judged_again_in_each_members_last_session(self):
        potato, onion = self.make_ingredient(self.doomed, "Potato"), self.make_ingredient(self.kept, "Onion")
        self.roll_pan(self.ana, self.doomed, potato)
        self.roll_pan(self.ana, self.doomed, potato)
        self.roll_pan(self.ben, self.doomed, potato)
        self.roll_pan(self.ben, self.kept, onion)
        self.assertEqual(self.standing(self.ana, AchievementKey.king_of_the_grill), (True, 1.0))
        self.assertEqual(self.standing(self.ben, AchievementKey.king_of_the_grill), (True, 1.0))

        self.delete(self.doomed)

        self.assertEqual(self.standing(self.ana, AchievementKey.king_of_the_grill), (False, 0.0))
        self.assertEqual(self.standing(self.ben, AchievementKey.king_of_the_grill), (True, 1.0))

    def test_king_of_the_sauce_goes_with_the_session_whose_sauces_it_counted(self):
        potato = self.make_ingredient(self.doomed, "Potato")
        aioli = self.make_ingredient(self.doomed, "Aioli", IngredientType.SAUCE)
        self.roll_pan(self.ana, self.doomed, potato, aioli)
        self.assertEqual(self.standing(self.ana, AchievementKey.king_of_the_sauce), (True, 1.0))

        self.delete(self.doomed)

        self.assertEqual(self.standing(self.ana, AchievementKey.king_of_the_sauce), (False, 0.0))

    def test_achievements_that_cannot_be_lost_and_xp_stay(self):
        self.roll_pan(self.ana, self.doomed, self.make_ingredient(self.doomed, "Potato"))
        db.session.refresh(self.ana)
        earned = self.ana.experience_points

        self.delete(self.doomed)

        self.assertEqual(self.standing(self.ana, AchievementKey.first_blood)[0], True)
        self.assertEqual(self.ana.experience_points, earned)
