from back.src.driver.database import db
from back.src.dto.user import UserAccountDto, UserProfileDto
from back.src.dto.user_stats import UserStatsDto
from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import IngredientType
from back.src.entity.rating import Rating
from back.src.entity.user import User
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
        assert profile.level is not None and profile.next_level is not None
        self.assertEqual((profile.id, profile.name, profile.color), (self.ana.id, "ana", "#00ff00"))
        self.assertEqual(
            (profile.experience_points, profile.level.id, profile.next_level.id), (120, levels[1].id, levels[2].id)
        )
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

        self.assertEqual(
            stats.model_dump(),
            {
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
            },
        )

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
        assert achievement is not None
        self.ana.achievements = [achievement]
        db.session.commit()

        stats = self.stats(self.ana)

        self.assertEqual(stats.total_pans, 4)
        self.assertEqual(stats.total_ratings_given, 1)
        self.assertEqual(stats.average_rating_received, round((5 + 2 + 3 + 1) / 4, 2))
        assert stats.favorite_ingredient is not None and stats.best_rated_ingredient is not None
        assert stats.most_pans_session is not None and stats.most_ingredients_pan is not None
        assert stats.most_ingredients_pan.author is not None
        self.assertEqual(stats.favorite_ingredient.id, self.potato.id)
        self.assertEqual(stats.favorite_ingredient.name, "Potato")
        self.assertEqual(
            (stats.best_rated_ingredient.ingredient.id, stats.best_rated_ingredient.avg_rating), (self.leek.id, 5.0)
        )
        self.assertEqual(stats.total_achievement_points, achievement.value)
        self.assertEqual(stats.average_ingredients_per_pan, round(7 / 4, 2))
        self.assertEqual(
            stats.most_pans_session.model_dump(), {"session_id": self.s1.id, "session_name": "s1", "pan_count": 3}
        )
        self.assertEqual(stats.sessions_participated, 2)
        self.assertEqual(stats.most_ingredients_pan.id, big.id)
        self.assertEqual(len(stats.most_ingredients_pan.ingredients), 3)
        self.assertEqual(stats.most_ingredients_pan.author.name, "ana")


class TestAdminRights(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", is_admin=True)
        self.ben = self.make_user("Ben")
        self.cleo = self.make_user("cleo", is_admin=True)

    def admins(self) -> list[str]:
        return sorted((u.name for u in db.session.query(User).filter_by(is_admin=True)), key=str.casefold)

    def test_an_admin_lists_every_user_by_name_with_their_rights(self):
        response = self.call("GET", "/users", self.ana)

        self.assertEqual(response.status_code, 200, response.json)
        users = [UserAccountDto.model_validate(u) for u in response.json]
        self.assertEqual([(u.name, u.is_admin) for u in users], [("ana", True), ("Ben", False), ("cleo", True)])
        self.assertNotIn("email", response.json[0])

    def test_an_admin_grants_admin(self):
        response = self.call("PATCH", f"/users/{self.ben.id}", self.ana, body={"is_admin": True})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(UserAccountDto.model_validate(response.json).is_admin, True)
        self.assertEqual(self.admins(), ["ana", "Ben", "cleo"])
        self.assertEqual(self.call("POST", "/preparation_type", self.ben, body={"name": "Grill"}).status_code, 200)

    def test_an_admin_revokes_another_admins_rights(self):
        response = self.call("PATCH", f"/users/{self.cleo.id}", self.ana, body={"is_admin": False})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertFalse(response.json["is_admin"])
        self.assertEqual(self.admins(), ["ana"])
        self.assertEqual(self.call("GET", "/users", self.cleo).status_code, 403)

    def test_granting_twice_changes_nothing(self):
        self.call("PATCH", f"/users/{self.ben.id}", self.ana, body={"is_admin": True})

        response = self.call("PATCH", f"/users/{self.ben.id}", self.ana, body={"is_admin": True})

        self.assertEqual((response.status_code, response.json["is_admin"]), (200, True))

    def test_a_non_admin_neither_lists_nor_changes_admin_rights(self):
        with self.recorded_writes() as writes:
            responses = [
                self.call("GET", "/users", self.ben),
                self.call("PATCH", f"/users/{self.ben.id}", self.ben, body={"is_admin": True}),
                self.call("PATCH", f"/users/{self.ana.id}", self.ben, body={"is_admin": False}),
            ]

        self.assertEqual([r.status_code for r in responses], [403, 403, 403])
        self.assertEqual(writes, [])
        self.assertEqual(self.admins(), ["ana", "cleo"])

    def test_an_admin_cant_revoke_their_own_admin(self):
        with self.recorded_writes() as writes:
            response = self.call("PATCH", f"/users/{self.ana.id}", self.ana, body={"is_admin": False})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(writes, [])
        self.assertEqual(self.admins(), ["ana", "cleo"])

    def test_the_last_admin_stays_one(self):
        self.call("PATCH", f"/users/{self.cleo.id}", self.ana, body={"is_admin": False})

        response = self.call("PATCH", f"/users/{self.ana.id}", self.ana, body={"is_admin": False})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.admins(), ["ana"])

    def test_unknown_user_invalid_body_and_no_token(self):
        self.assertEqual(self.call("PATCH", "/users/999", self.ana, body={"is_admin": True}).status_code, 404)
        for body in ({}, {"is_admin": None}, {"is_admin": True, "name": "x"}):
            with self.subTest(body=body):
                self.assertEqual(self.call("PATCH", f"/users/{self.ben.id}", self.ana, body=body).status_code, 400)
        self.assertEqual(self.call("GET", "/users").status_code, 401)
        self.assertEqual(self.call("PATCH", f"/users/{self.ben.id}", body={"is_admin": True}).status_code, 401)
