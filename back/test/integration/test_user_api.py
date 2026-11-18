from back.src.driver.database import db
from back.src.dto.user import UserProfileDto
from back.src.dto.user_stats import UserStatsDto
from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import IngredientType
from back.src.entity.rating import Rating
from back.src.repository.level_repository import LevelRepository
from back.test.support import AppTest


class TestUserProfile(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", experience_points=120, meat=True, color="#00ff00")
        self.ana.email = "ana@example.com"
        self.ben = self.make_user("ben")
        db.session.commit()

    def test_profile_is_public_and_leaves_out_email_and_diet(self):
        first, second = db.session.query(Achievement).order_by(Achievement.id).limit(2).all()
        self.ana.achievements = [first, second]
        db.session.commit()
        levels = LevelRepository().all_ordered()

        response = self.call("GET", f"/users/{self.ana.id}", self.ben)

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), set(UserProfileDto.model_fields))
        for private in ("email", "password", "meat", "vegetarian", "vegan", "language", "level_id"):
            self.assertNotIn(private, response.json)
        profile = UserProfileDto.model_validate(response.json)
        self.assertEqual((profile.id, profile.name, profile.color), (self.ana.id, "ana", "#00ff00"))
        self.assertEqual((profile.experience_points, profile.level.id, profile.next_level.id),
                         (120, levels[1].id, levels[2].id))
        self.assertEqual([a.id for a in profile.achievements], [first.id, second.id])

    def test_profile_without_achievements_has_an_empty_list(self):
        self.assertEqual(self.call("GET", f"/users/{self.ben.id}", self.ana).json["achievements"], [])

    def test_unknown_user_is_404_and_a_token_is_required(self):
        self.assertEqual(self.call("GET", "/users/999", self.ana).status_code, 404)
        self.assertEqual(self.call("GET", "/users/999/stats", self.ana).status_code, 404)
        self.assertEqual(self.call("GET", f"/users/{self.ana.id}").status_code, 401)
        self.assertEqual(self.call("GET", f"/users/{self.ana.id}/stats").status_code, 401)


class TestUserStats(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.s1 = self.make_session("s1", creator=self.ana)
        self.s2 = self.make_session("s2", creator=self.ana)
        self.potato = self.make_ingredient(self.s1, "Potato")
        self.leek = self.make_ingredient(self.s1, "Leek")
        self.aioli = self.make_ingredient(self.s1, "Aioli", IngredientType.SAUCE)
        self.corn = self.make_ingredient(self.s2, "Corn")

    def stats(self, user) -> UserStatsDto:
        response = self.call("GET", f"/users/{user.id}/stats", self.ben)
        self.assertEqual(response.status_code, 200, response.json)
        return UserStatsDto.model_validate(response.json)

    def rate(self, pan, stars: float, rater=None):
        rater = rater or self.ben
        db.session.add(Rating(rating=stars, user_id=rater.id, pan_id=pan.id, session_id=pan.session_id))
        db.session.commit()

    def test_a_user_without_pans(self):
        stats = self.stats(self.ana)

        self.assertEqual(stats.model_dump(), {
            "total_pans": 0,
            "total_ratings_given": 0,
            "average_rating_received": 0.0,
            "favorite_ingredient": None,
            "best_rated_ingredient": None,
            "total_achievement_points": 0,
            "average_ingredients_per_pan": 0.0,
            "most_pans_session": None,
            "sessions_participated": 0,
            "most_ingredients_pan": None,
        })

    def test_stats_over_pans_ratings_and_achievements(self):
        big = self.make_pan(self.ana, self.s1, [self.potato, self.leek, self.aioli])
        mid = self.make_pan(self.ana, self.s1, [self.potato, self.aioli])
        self.make_pan(self.ana, self.s1, [self.potato])
        other = self.make_pan(self.ana, self.s2, [self.corn])
        self.make_pan(self.ben, self.s1, [self.leek])
        self.rate(big, 5)
        self.rate(mid, 2)
        self.rate(other, 3)
        self.rate(other, 1, rater=self.ana)
        achievement = db.session.query(Achievement).order_by(Achievement.id).first()
        self.ana.achievements = [achievement]
        db.session.commit()

        stats = self.stats(self.ana)

        self.assertEqual(stats.total_pans, 4)
        self.assertEqual(stats.total_ratings_given, 1)
        self.assertEqual(stats.average_rating_received, round((5 + 2 + 3 + 1) / 4, 2))
        self.assertEqual(stats.favorite_ingredient.id, self.potato.id)
        self.assertEqual(stats.favorite_ingredient.name, "Potato")
        self.assertEqual((stats.best_rated_ingredient.ingredient.id, stats.best_rated_ingredient.avg_rating),
                         (self.leek.id, 5.0))
        self.assertEqual(stats.total_achievement_points, achievement.value)
        self.assertEqual(stats.average_ingredients_per_pan, round(7 / 4, 2))
        self.assertEqual(stats.most_pans_session.model_dump(),
                         {"session_id": self.s1.id, "session_name": "s1", "pan_count": 3})
        self.assertEqual(stats.sessions_participated, 2)
        self.assertEqual(stats.most_ingredients_pan.id, big.id)
        self.assertEqual(len(stats.most_ingredients_pan.ingredients), 3)
        self.assertEqual(stats.most_ingredients_pan.author.name, "ana")
