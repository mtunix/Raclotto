from back.src.driver.database import db
from back.src.entity.pan import Pan
from back.src.entity.rating import Rating
from back.src.entity.user import User, user_sessions
from back.src.interactor.levels import Levels
from back.src.interactor.session_recap import Recap, SessionRecaps
from back.test.support import AppTest


class SessionRecapTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.cleo = self.make_user("cleo")
        self.session = self.make_session("s1", creator=self.ana)
        self.potato = self.make_ingredient(self.session, "Potato")
        self.leek = self.make_ingredient(self.session, "Leek")
        self.chili = self.make_ingredient(self.session, "Chili", spicy=2, wildcard=True)

    def rate(self, pan: Pan, user: User, stars: float) -> None:
        db.session.add(Rating(rating=stars, user_id=user.id, pan_id=pan.id, session_id=self.session.id))
        db.session.commit()

    def recap(self) -> Recap:
        db.session.expire_all()
        return SessionRecaps().of(self.session)

    def test_best_worst_and_boldest_pan(self):
        plain = self.make_pan(self.ana, self.session, [self.potato], minutes_ago=30)
        good = self.make_pan(self.ben, self.session, [self.potato, self.leek], minutes_ago=20)
        bold = self.make_pan(self.ben, self.session, [self.potato, self.chili], minutes_ago=10)
        self.rate(plain, self.ben, 2)
        self.rate(good, self.ana, 5)
        self.rate(good, self.cleo, 4)

        recap = self.recap()

        self.assertEqual((recap.best_pan, recap.worst_pan, recap.boldest_pan), (good, plain, bold))
        self.assertEqual(recap.boldest_pan_xp, Levels().xp_for(bold))
        self.assertEqual((recap.pan_count, recap.rating_count), (3, 3))
        self.assertEqual(recap.last_pan_at, bold.timestamp)
        self.assertEqual((recap.favorite_ingredient, recap.favorite_ingredient_pans), (self.potato, 3))
        self.assertEqual(recap.authors, {self.ana.id: self.ana, self.ben.id: self.ben})

    def test_equal_stars_go_to_more_ratings_then_the_earlier_pan(self):
        first = self.make_pan(self.ana, self.session, [self.potato], minutes_ago=30)
        second = self.make_pan(self.ben, self.session, [self.potato], minutes_ago=20)
        third = self.make_pan(self.ben, self.session, [self.potato], minutes_ago=10)
        self.rate(first, self.ben, 4)
        self.rate(second, self.ana, 4)
        self.rate(second, self.cleo, 4)
        self.rate(third, self.ana, 4)

        recap = self.recap()

        self.assertEqual((recap.best_pan, recap.worst_pan), (second, first))

    def test_a_worst_pan_needs_two_rated_pans(self):
        rated = self.make_pan(self.ana, self.session, [self.potato])
        self.make_pan(self.ben, self.session, [self.potato])
        self.rate(rated, self.ben, 3)

        recap = self.recap()

        self.assertEqual((recap.best_pan, recap.worst_pan), (rated, None))

    def test_participants_are_members_and_rollers_most_xp_first(self):
        db.session.execute(user_sessions.insert().values(user_id=self.cleo.id, session_id=self.session.id))
        db.session.commit()
        small = self.make_pan(self.ana, self.session, [self.potato])
        big = self.make_pan(self.ben, self.session, [self.potato, self.leek, self.chili])
        self.rate(big, self.ana, 5)
        self.rate(small, self.ben, 3)
        self.rate(big, self.cleo, 4)

        participants = self.recap().participants

        self.assertEqual(
            [(p.user.name, p.pan_count, p.xp, p.average_rating, p.ratings_given) for p in participants],
            [
                ("ben", 1, Levels().xp_for(big), 4.5, 1),
                ("ana", 1, Levels().xp_for(small), 3.0, 1),
                ("cleo", 0, 0, None, 1),
            ],
        )

    def test_a_session_without_pans(self):
        recap = self.recap()

        self.assertEqual(
            (recap.pan_count, recap.best_pan, recap.boldest_pan, recap.favorite_ingredient), (0, None, None, None)
        )
        self.assertEqual((recap.session, recap.last_pan_at, recap.participants), (self.session, None, []))

    def test_pans_of_other_sessions_stay_out(self):
        other = self.make_session("s2")
        self.make_pan(self.ben, other, [self.make_ingredient(other, "Corn")])

        self.assertEqual(self.recap().pan_count, 0)

    def test_reading_writes_nothing(self):
        self.rate(self.make_pan(self.ana, self.session, [self.potato]), self.ben, 4)

        with self.recorded_writes() as writes:
            self.recap()

        self.assertEqual(writes, [])
