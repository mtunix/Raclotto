from back.src.entity.ingredient import IngredientType
from back.src.repository.achievement_repository import AchievementRepository
from back.test.support import AppTest


class TestAchievementApi(AppTest):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("testuser")
        self.session = self.make_session("test-session-key", creator=self.user)
        self.local_guide = AchievementRepository().by_title("Local Guide")

    def rate_distinct_pans(self, count: int):
        owner = self.make_user("owner")
        ingredient = self.make_ingredient(self.session, "Test Ingredient", IngredientType.FILL)
        for _ in range(count):
            pan = self.make_pan(owner, self.session, [ingredient])
            response = self.post(
                self.user, "/ratings", {"rating": 5, "pan_id": pan.id},
                session_key=self.session.key,
            )
            self.assertIn(response.status_code, (200, 201), response.json)

    def local_guide_attributes(self) -> dict:
        response = self.client.get("/api/achievements", headers=self.auth(self.user))
        self.assertEqual(response.status_code, 200)
        return next(
            a["attributes"] for a in response.json["data"]
            if a["attributes"]["title"] == "Local Guide"
        )

    def test_list_achievements_requires_auth(self):
        response = self.client.get(
            "/api/achievements", headers={"Accept": "application/vnd.api+json"}
        )
        self.assertEqual(response.status_code, 401)

    def test_every_achievement_has_unlocked_and_progress(self):
        response = self.client.get("/api/achievements", headers=self.auth(self.user))

        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.json["data"]), 0)
        for achievement in response.json["data"]:
            attributes = achievement["attributes"]
            self.assertIsInstance(attributes["unlocked"], bool)
            progress = attributes["progress"]
            if progress is not None:
                self.assertGreaterEqual(progress, 0.0)
                self.assertLessEqual(progress, 1.0)

    def test_progress_after_three_ratings(self):
        self.rate_distinct_pans(3)
        self.assertAlmostEqual(self.local_guide_attributes()["progress"], 0.3, places=2)

    def test_rerating_the_same_pan_counts_once(self):
        owner = self.make_user("owner")
        pan = self.make_pan(owner, self.session, [self.make_ingredient(self.session, "X")])
        for stars in (3, 4, 5):
            self.post(self.user, "/ratings", {"rating": stars, "pan_id": pan.id}, session_key=self.session.key)
        self.assertAlmostEqual(self.local_guide_attributes()["progress"], 0.1, places=2)

    def test_unlocked_after_ten_ratings(self):
        self.rate_distinct_pans(10)
        attributes = self.local_guide_attributes()
        self.assertTrue(attributes["unlocked"])
        self.assertAlmostEqual(attributes["progress"], 1.0, places=2)

    def test_get_achievement_by_id(self):
        anonymous = self.client.get(
            f"/api/achievements/{self.local_guide.id}",
            headers={"Accept": "application/vnd.api+json"},
        )
        response = self.client.get(
            f"/api/achievements/{self.local_guide.id}", headers=self.auth(self.user)
        )
        self.assertEqual(anonymous.status_code, 401)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["data"]["id"], str(self.local_guide.id))
