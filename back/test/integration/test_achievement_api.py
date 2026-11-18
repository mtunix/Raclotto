from pydantic import TypeAdapter

from back.src.driver.database import db
from back.src.dto.achievement import AchievementDto, AchievementStatusDto, LeaderboardEntryDto
from back.src.entity.ingredient import IngredientType
from back.src.repository.achievement_repository import AchievementRepository
from back.test.support import AppTest


class TestAchievementApi(AppTest):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("testuser")
        self.session = self.make_session("test-session-key", creator=self.user)
        local_guide = AchievementRepository().by_title("Local Guide")
        assert local_guide is not None
        self.local_guide = local_guide

    def rate_distinct_pans(self, count: int):
        owner = self.make_user("owner")
        ingredient = self.make_ingredient(self.session, "Test Ingredient", IngredientType.FILL)
        for _ in range(count):
            pan = self.make_pan(owner, self.session, [ingredient])
            response = self.call("POST", "/ratings", self.user, body={"rating": 5, "pan_id": pan.id})
            self.assertEqual(response.status_code, 200, response.json)

    def statuses(self, user=None) -> list[AchievementStatusDto]:
        response = self.call("GET", "/achievements", user or self.user)
        self.assertEqual(response.status_code, 200, response.json)
        return TypeAdapter(list[AchievementStatusDto]).validate_python(response.json)

    def local_guide_status(self) -> AchievementStatusDto:
        return next(a for a in self.statuses() if a.title == "Local Guide")

    def local_guide_progress(self) -> float:
        progress = self.local_guide_status().progress
        assert progress is not None
        return progress

    def unlock(self, user, *titles: str | None):
        repository = AchievementRepository()
        user.achievements.extend(repository.by_title(title) for title in titles)
        db.session.commit()

    def test_achievements_require_auth(self):
        for path in ("/achievements", f"/achievements/{self.local_guide.id}", "/achievements/leaderboard"):
            with self.subTest(path=path):
                self.assertEqual(self.call("GET", path).status_code, 401)

    def test_every_achievement_has_unlocked_and_progress(self):
        response = self.call("GET", "/achievements", self.user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), len(AchievementRepository().all()))
        for achievement in response.json:
            self.assertEqual(set(achievement), set(AchievementStatusDto.model_fields))
            self.assertIsInstance(achievement["unlocked"], bool)
            progress = achievement["progress"]
            if progress is not None:
                self.assertGreaterEqual(progress, 0.0)
                self.assertLessEqual(progress, 1.0)

    def test_listing_writes_nothing(self):
        self.rate_distinct_pans(3)

        with self.recorded_writes() as writes:
            self.statuses()

        self.assertEqual(writes, [])

    def test_progress_after_three_ratings(self):
        self.rate_distinct_pans(3)
        self.assertAlmostEqual(self.local_guide_progress(), 0.3, places=2)

    def test_rerating_the_same_pan_counts_once(self):
        owner = self.make_user("owner")
        pan = self.make_pan(owner, self.session, [self.make_ingredient(self.session, "X")])
        for stars in (3, 4, 5):
            response = self.call("POST", "/ratings", self.user, body={"rating": stars, "pan_id": pan.id})
            self.assertEqual(response.status_code, 200, response.json)
        self.assertAlmostEqual(self.local_guide_progress(), 0.1, places=2)

    def test_unlocked_after_ten_ratings(self):
        self.rate_distinct_pans(10)
        status = self.local_guide_status()
        self.assertTrue(status.unlocked)
        assert status.progress is not None
        self.assertAlmostEqual(status.progress, 1.0, places=2)

    def test_unlocked_is_per_user(self):
        other = self.make_user("other")
        self.unlock(other, "Local Guide")

        self.assertFalse(self.local_guide_status().unlocked)
        self.assertTrue(next(a for a in self.statuses(other) if a.title == "Local Guide").unlocked)

    def test_get_achievement_by_id(self):
        response = self.call("GET", f"/achievements/{self.local_guide.id}", self.user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, AchievementDto.model_validate(self.local_guide).model_dump())

    def test_unknown_achievement_is_404(self):
        self.assertEqual(self.call("GET", "/achievements/9999", self.user).status_code, 404)

    def test_leaderboard_ranks_by_points_then_name(self):
        a, b = [x for x in AchievementRepository().all() if (x.value or 0) > 0][:2]
        assert a.value is not None and b.value is not None
        zoe, bea, adam = self.make_user("zoe"), self.make_user("bea"), self.make_user("adam")
        self.unlock(zoe, a.title, b.title)
        self.unlock(bea, a.title)
        self.unlock(adam, a.title)

        response = self.call("GET", "/achievements/leaderboard", self.user)

        self.assertEqual(response.status_code, 200)
        entries = TypeAdapter(list[LeaderboardEntryDto]).validate_python(response.json)
        self.assertEqual(
            [(e.rank, e.user_id, e.name, e.total_points, e.achievement_count) for e in entries],
            [
                (1, zoe.id, "zoe", a.value + b.value, 2),
                # Equal points: by name, each with a rank of its own.
                (2, adam.id, "adam", a.value, 1),
                (3, bea.id, "bea", a.value, 1),
                (4, self.user.id, "testuser", 0, 0),
            ],
        )
