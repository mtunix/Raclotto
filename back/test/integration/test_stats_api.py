from back.src.driver.database import db
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto
from back.src.dto.stats import StatsDto
from back.src.entity.ingredient import IngredientType
from back.src.entity.rating import Rating
from back.src.repository.achievement_repository import AchievementRepository
from back.test.support import AppTest


class StatsApiTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", color="#ff8800")
        self.ben = self.make_user("ben")
        self.s1 = self.make_session("s1", creator=self.ana)
        self.s2 = self.make_session("s2", creator=self.ben)
        self.potato = self.make_ingredient(self.s1, "Potato", spicy=2, fish=True)
        self.leek = self.make_ingredient(self.s1, "Leek")
        self.aioli = self.make_ingredient(self.s1, "Aioli", IngredientType.SAUCE)
        self.corn = self.make_ingredient(self.s2, "Corn")
        self.old = self.make_pan(self.ana, self.s1, [self.potato, self.aioli], minutes_ago=10)
        self.new = self.make_pan(self.ben, self.s1, [self.potato, self.leek], minutes_ago=1)
        self.other = self.make_pan(self.ben, self.s2, [self.corn], minutes_ago=5)
        self.rate(self.old, self.ben, 5)
        self.rate(self.new, self.ana, 2)
        self.rate(self.other, self.ana, 4)
        self.ana.achievements.append(AchievementRepository().all()[0])
        db.session.commit()

    def rate(self, pan, user, stars):
        db.session.add(Rating(rating=stars, user_id=user.id, pan_id=pan.id, session_id=pan.session_id))
        db.session.commit()

    def stats(self, **query) -> StatsDto:
        response = self.call("GET", "/stats", self.ana, query=query)
        self.assertEqual(response.status_code, 200, response.json)
        return StatsDto.model_validate(response.json)

    def test_a_sessions_stats(self):
        stats = self.stats(session_key="s1")

        self.assertEqual([p.id for p in stats.pans], [self.new.id, self.old.id])
        db.session.refresh(self.new)
        self.assertEqual(stats.pans[0], PanDto.of(self.new, self.ben))
        author = stats.pans[1].author
        assert author is not None
        self.assertEqual((author.name, author.color), ("ana", "#ff8800"))
        self.assertEqual(
            [(r.ingredient.name, r.avg_rating) for r in stats.ingredients_top_rated],
            [("Aioli", 5.0), ("Potato", 3.5), ("Leek", 2.0)],
        )
        self.assertEqual(stats.ingredients_top_rated[1].ingredient, IngredientDto.model_validate(self.potato))
        self.assertEqual(
            [(u.ingredient.name, u.pan_count) for u in stats.ingredients_most_used][:1],
            [("Potato", 2)],
        )
        self.assertEqual({u.ingredient.name for u in stats.ingredients_most_used}, {"Potato", "Leek", "Aioli"})
        self.assertEqual([(e.name, e.rank) for e in stats.leaderboard], [("ana", 1), ("ben", 2)])

    def test_global_stats_cover_every_session(self):
        stats = self.stats()

        self.assertEqual([p.id for p in stats.pans], [self.new.id, self.other.id, self.old.id])
        self.assertIn("Corn", {r.ingredient.name for r in stats.ingredients_top_rated})
        self.assertIn("Corn", {u.ingredient.name for u in stats.ingredients_most_used})

    def test_only_the_thirty_newest_pans_of_a_session_and_ten_of_all(self):
        for minutes in range(20, 50):
            self.make_pan(self.ana, self.s1, [self.leek], minutes_ago=minutes)

        pans = self.stats(session_key="s1").pans

        self.assertEqual(len(pans), 30)
        self.assertEqual(pans[:2], [p for p in pans if p.id in (self.new.id, self.old.id)])
        self.assertEqual(len(self.stats().pans), 10)

    def test_an_unknown_session_has_only_the_leaderboard(self):
        stats = self.stats(session_key="nope")

        self.assertEqual((stats.pans, stats.ingredients_top_rated, stats.ingredients_most_used), ([], [], []))
        self.assertEqual(len(stats.leaderboard), 2)

    def test_stats_need_auth_and_a_non_empty_key(self):
        self.assertEqual(self.call("GET", "/stats").status_code, 401)
        response = self.call("GET", "/stats", self.ana, query={"session_key": ""})
        self.assertEqual(response.status_code, 400)
        self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], ["/query/session_key"])
