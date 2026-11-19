from back.src.driver.database import db
from back.src.dto.rating import RatingDto
from back.src.entity.rating import Rating
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import AchievementEvaluator
from back.src.interactor.achievement_registry import get_registry
from back.src.interactor.facts import PanRated
from back.test.support import AppTest


class BrokenOnRating(AchievementEvaluator):
    reacts_to = (PanRated,)

    def judge(self, fact, subject, achievement, context):
        raise RuntimeError("boom")

    def calculate_progress(self, user, achievement, context):
        return None


class TestRatingApi(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.s1 = self.make_session("s1", creator=self.ana)
        self.s2 = self.make_session("s2", creator=self.ben)
        self.pan = self.make_pan(self.ana, self.s1, [self.make_ingredient(self.s1, "Potato")])

    def rate(self, user, stars, pan=None, **extra):
        return self.call("POST", "/ratings", user, body={"pan_id": (pan or self.pan).id, "rating": stars, **extra})

    def stored(self) -> list:
        # What the requests committed; the app context the test holds outlives each request's.
        db.session.rollback()
        return [(r.user_id, r.pan_id, r.session_id, r.rating) for r in db.session.query(Rating).order_by(Rating.id)]

    def test_rating_belongs_to_the_signed_in_user_and_the_pans_session(self):
        response = self.rate(self.ben, 4)

        self.assertEqual(response.status_code, 200, response.json)
        rating = RatingDto.model_validate(response.json)
        self.assertEqual(
            (rating.user_id, rating.pan_id, rating.session_id, rating.rating), (self.ben.id, self.pan.id, self.s1.id, 4)
        )
        self.assertEqual(self.stored(), [(self.ben.id, self.pan.id, self.s1.id, 4)])

    def test_a_rating_whose_achievements_fail_is_not_saved(self):
        evaluators = get_registry().evaluators
        self.addCleanup(evaluators.__setitem__, "local_guide", evaluators["local_guide"])
        evaluators["local_guide"] = BrokenOnRating()

        response = self.rate(self.ben, 4)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(self.stored(), [])

    def test_rating_cannot_name_another_user(self):
        response = self.rate(self.ben, 4, user_id=self.ana.id)

        self.assertEqual(response.status_code, 400, response.json)
        self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], ["/body/user_id"])
        self.assertEqual(self.stored(), [])

    def test_rating_the_same_pan_again_updates_it(self):
        first = self.rate(self.ben, 2).json
        second = self.rate(self.ben, 5).json

        self.assertEqual(second["id"], first["id"])
        self.assertEqual(second["rating"], 5)
        self.assertEqual(self.stored(), [(self.ben.id, self.pan.id, self.s1.id, 5)])

    def test_half_stars_are_kept(self):
        response = self.rate(self.ben, 3.5)

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json["rating"], 3.5)
        pan = self.call("GET", f"/pans/{self.pan.id}", self.ana).json
        self.assertEqual((pan["rating"], pan["ratings"][0]["rating"]), (3.5, 3.5))

    def test_stars_are_validated(self):
        for stars in (-1, 5.5, 4.2, "five", None):
            with self.subTest(stars=stars):
                response = self.rate(self.ben, stars)
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], ["/body/rating"])
        for stars in (0, 5):
            with self.subTest(stars=stars):
                self.assertEqual(self.rate(self.ben, stars).status_code, 200)

    def test_rating_a_missing_pan_is_404(self):
        response = self.call("POST", "/ratings", self.ben, body={"pan_id": 999, "rating": 3})

        self.assertEqual(response.status_code, 404, response.json)
        self.assertEqual(response.json["errors"][0]["title"], "Pan not found")
        self.assertEqual(self.stored(), [])

    def test_list_get_update_delete(self):
        rating_id = self.rate(self.ben, 2).json["id"]
        elsewhere = self.make_pan(self.ben, self.s2, [self.make_ingredient(self.s2, "Leek")])
        self.rate(self.ana, 1, pan=elsewhere)

        everything = self.call("GET", "/ratings", self.ana)
        in_s1 = self.call("GET", "/ratings", self.ana, query={"session_key": "s1"})
        unknown = self.call("GET", "/ratings", self.ana, query={"session_key": "nope"})
        self.assertEqual(len(everything.json), 2)
        self.assertEqual([r["id"] for r in in_s1.json], [rating_id])
        self.assertEqual(unknown.json, [])

        self.assertEqual(self.call("GET", f"/ratings/{rating_id}", self.ana).json["rating"], 2)

        updated = self.call("PATCH", f"/ratings/{rating_id}", self.ben, body={"rating": 4})
        self.assertEqual(updated.status_code, 200, updated.json)
        self.assertEqual(updated.json["rating"], 4)
        moved = self.call("PATCH", f"/ratings/{rating_id}", self.ben, body={"rating": 4, "pan_id": elsewhere.id})
        self.assertEqual(moved.status_code, 400, moved.json)

        deleted = self.call("DELETE", f"/ratings/{rating_id}", self.ben)
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(deleted.get_data(), b"")
        self.assertEqual(self.call("GET", f"/ratings/{rating_id}", self.ana).status_code, 404)
        self.assertEqual(self.call("DELETE", f"/ratings/{rating_id}", self.ana).status_code, 404)

    def test_someone_elses_rating_is_reported_as_missing(self):
        rating_id = self.rate(self.ben, 2).json["id"]

        changed = self.call("PATCH", f"/ratings/{rating_id}", self.ana, body={"rating": 5})
        withdrawn = self.call("DELETE", f"/ratings/{rating_id}", self.ana)

        self.assertEqual((changed.status_code, withdrawn.status_code), (404, 404))
        self.assertEqual(changed.json["errors"][0]["title"], "Rating not found")
        self.assertEqual(self.stored(), [(self.ben.id, self.pan.id, self.s1.id, 2)])

    def best_rated_by_a_change(self, change) -> list:
        """Ana's pan trails Dan's (3 to 4 stars) until Ben's rating changes from 2 to 5."""
        cara, dan = self.make_user("cara"), self.make_user("dan")
        rival = self.make_pan(dan, self.s1, [self.make_ingredient(self.s1, "Leek")])
        self.rate(self.ben, 4, pan=rival)
        self.rate(cara, 4, pan=rival)
        rating_id = self.rate(self.ben, 2).json["id"]
        self.rate(cara, 4)

        self.assertEqual(change(rating_id).status_code, 200)
        db.session.rollback()
        return [a.title for a in db.session.get_one(User, self.ana.id).achievements]

    def test_rating_a_pan_again_lets_achievements_react(self):
        self.assertIn("Pantastic", self.best_rated_by_a_change(lambda _: self.rate(self.ben, 5)))

    def test_changing_a_rating_lets_achievements_react(self):
        titles = self.best_rated_by_a_change(
            lambda rating_id: self.call("PATCH", f"/ratings/{rating_id}", self.ben, body={"rating": 5})
        )
        self.assertIn("Pantastic", titles)

    def test_rating_routes_require_auth(self):
        for method, path, body in (
            ("GET", "/ratings", None),
            ("POST", "/ratings", {"pan_id": self.pan.id, "rating": 3}),
            ("GET", "/ratings/1", None),
            ("PATCH", "/ratings/1", {"rating": 3}),
            ("DELETE", "/ratings/1", None),
        ):
            with self.subTest(method=method, path=path):
                self.assertEqual(self.call(method, path, body=body).status_code, 401)
        self.assertEqual(self.stored(), [])
