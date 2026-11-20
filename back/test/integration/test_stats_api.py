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
        self.potato = self.make_ingredient(self.s1, "Potato", spicy=2, fish=True)
        self.aioli = self.make_ingredient(self.s1, "Aioli", IngredientType.SAUCE)
        self.old = self.make_pan(self.ana, self.s1, [self.potato, self.aioli], minutes_ago=10)
        self.new = self.make_pan(self.ben, self.s1, [self.potato], minutes_ago=1)
        db.session.add(Rating(rating=4, user_id=self.ana.id, pan_id=self.new.id, session_id=self.s1.id))
        self.ana.achievements.append(AchievementRepository().all()[0])
        db.session.commit()

    def test_a_sessions_dashboard_as_json(self):
        response = self.call("GET", "/stats", self.ana, query={"session_key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), set(StatsDto.model_fields))
        stats = StatsDto.model_validate(response.json)
        db.session.refresh(self.new)
        self.assertEqual(stats.pans[0], PanDto.of(self.new, self.ben))
        author = stats.pans[1].author
        assert author is not None
        self.assertEqual((author.name, author.color), ("ana", "#ff8800"))
        [top] = stats.ingredients_top_rated
        self.assertEqual((top.ingredient, top.avg_rating), (IngredientDto.model_validate(self.potato), 4.0))
        most_used = stats.ingredients_most_used[0]
        self.assertEqual((most_used.ingredient, most_used.pan_count), (IngredientDto.model_validate(self.potato), 2))
        self.assertEqual([(e.name, e.rank) for e in stats.leaderboard], [("ana", 1), ("ben", 2)])

    def test_stats_need_auth_and_a_non_empty_key(self):
        self.assertEqual(self.call("GET", "/stats").status_code, 401)
        response = self.call("GET", "/stats", self.ana, query={"session_key": ""})
        self.assertEqual(response.status_code, 400)
        self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], ["/query/session_key"])
