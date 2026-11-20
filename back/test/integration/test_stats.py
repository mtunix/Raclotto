from datetime import datetime, timedelta

from back.src.driver.database import db
from back.src.entity.event import Event
from back.src.entity.ingredient import IngredientType
from back.src.entity.rating import Rating
from back.src.interactor.stats import Stats
from back.src.repository.achievement_repository import AchievementRepository
from back.src.repository.event_repository import EventRepository
from back.test.support import AppTest


class StatsTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.s1 = self.make_session("s1", creator=self.ana)
        s2 = self.make_session("s2", creator=self.ben)
        self.potato = self.make_ingredient(self.s1, "Potato")
        self.leek = self.make_ingredient(self.s1, "Leek")
        self.aioli = self.make_ingredient(self.s1, "Aioli", IngredientType.SAUCE)
        self.corn = self.make_ingredient(s2, "Corn")
        self.old = self.make_pan(self.ana, self.s1, [self.potato, self.aioli], minutes_ago=10)
        self.new = self.make_pan(self.ben, self.s1, [self.potato, self.leek], minutes_ago=1)
        self.other = self.make_pan(self.ben, s2, [self.corn], minutes_ago=5)
        for pan, rater, stars in ((self.old, self.ben, 5), (self.new, self.ana, 2), (self.other, self.ana, 4)):
            db.session.add(Rating(rating=stars, user_id=rater.id, pan_id=pan.id, session_id=pan.session_id))
        self.ben.achievements.append(AchievementRepository().all()[0])
        db.session.commit()

    def test_a_sessions_dashboard(self):
        dashboard = Stats().of("s1")

        self.assertEqual(dashboard.pans, [self.new, self.old])
        self.assertEqual(dashboard.authors, {self.ana.id: self.ana, self.ben.id: self.ben})
        self.assertEqual(dashboard.top_rated, [(self.aioli, 5.0), (self.potato, 3.5), (self.leek, 2.0)])
        self.assertEqual(dashboard.most_used[0], (self.potato, 2))
        self.assertEqual({ingredient for ingredient, _ in dashboard.most_used}, {self.potato, self.leek, self.aioli})
        self.assertEqual([row[1] for row in dashboard.standings], ["ben", "ana"])

    def test_every_sessions_dashboard(self):
        dashboard = Stats().of(None)

        self.assertEqual(dashboard.pans, [self.new, self.other, self.old])
        self.assertIn((self.corn, 4.0), dashboard.top_rated)
        self.assertIn((self.corn, 1), dashboard.most_used)

    def test_only_the_thirty_newest_pans_of_a_session_ten_of_all_and_ten_ingredients_each(self):
        for minutes in range(20, 50):
            self.make_pan(self.ana, self.s1, [self.leek], minutes_ago=minutes)
        many = [self.make_ingredient(self.s1, f"Extra {n}") for n in range(10)]
        extra = self.make_pan(self.ana, self.s1, many, minutes_ago=60)
        db.session.add(Rating(rating=3, user_id=self.ben.id, pan_id=extra.id, session_id=self.s1.id))
        db.session.commit()

        session = Stats().of("s1")

        self.assertEqual(len(session.pans), 30)
        self.assertEqual(session.pans[:2], [self.new, self.old])
        self.assertEqual(len(Stats().of(None).pans), 10)
        self.assertEqual((len(session.top_rated), len(session.most_used)), (10, 10))

    def test_a_sessions_feed_has_its_newest_events_even_dismissed_ones(self):
        events = [
            Event(
                session_id=session_id,
                event_type="pan_swap",
                message="",
                created_at=datetime.now() - timedelta(minutes=m),
            )
            for session_id, m in ((self.s1.id, 3), (self.s1.id, 1), (self.other.session_id, 2))
        ]
        db.session.add_all(events)
        db.session.flush()
        EventRepository().dismiss_for_user(events[1].id, self.ana.id)
        db.session.commit()

        self.assertEqual(Stats().of("s1").events, [events[1], events[0]])
        self.assertEqual(Stats().of(None).events, [])

    def test_an_unknown_session_has_only_the_leaderboard(self):
        dashboard = Stats().of("nope")

        self.assertEqual((dashboard.pans, dashboard.top_rated, dashboard.most_used), ([], [], []))
        self.assertEqual(len(dashboard.standings), 2)

    def test_reading_writes_nothing(self):
        with self.recorded_writes() as writes:
            Stats().of("s1")

        self.assertEqual(writes, [])
