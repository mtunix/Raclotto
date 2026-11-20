from collections.abc import Callable

from back.src.driver.database import db
from back.src.entity.pan import Pan
from back.src.entity.rating import Rating
from back.src.entity.user import User
from back.src.interactor.achievements import AchievementChanges, Achievements
from back.src.interactor.facts import Fact, PanRated
from back.src.interactor.pan_ratings import PanRatings, RatingNotFound
from back.test.support import AppTest


class Recording(Achievements):
    def __init__(self) -> None:
        super().__init__()
        self.facts: list[Fact] = []

    def record(self, fact: Fact) -> AchievementChanges:
        self.facts.append(fact)
        return super().record(fact)


class Exploding(Achievements):
    def record(self, fact: Fact) -> AchievementChanges:
        raise RuntimeError("boom")


def held(user: User) -> set[str | None]:
    db.session.refresh(user)
    return {a.title for a in user.achievements}


class TestPanRatings(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.session = self.make_session("s1", creator=self.ana)
        self.pan = self.make_pan(self.ana, self.session, [self.make_ingredient(self.session, "Potato")])
        self.achievements = Recording()
        self.ratings = PanRatings(achievements=self.achievements)

    def rate(self, rater: User, stars: float, pan: Pan | None = None) -> Rating:
        rating = self.ratings.rate(rater, pan or self.pan, stars)
        db.session.commit()
        return rating

    def stored(self) -> list[tuple[int, int, int, float]]:
        db.session.expire_all()
        return [(r.user_id, r.pan_id, r.session_id, r.rating) for r in db.session.query(Rating).order_by(Rating.id)]

    def rated(self, rating: Rating, rater: User) -> PanRated:
        return PanRated(rating=rating, pan=self.pan, rater=rater, session=self.session)

    def test_a_rating_belongs_to_the_rater_and_the_pans_session(self):
        rating = self.rate(self.ben, 4)

        self.assertEqual(self.stored(), [(self.ben.id, self.pan.id, self.session.id, 4)])
        self.assertEqual(self.achievements.facts, [self.rated(rating, self.ben)])

    def test_rating_the_same_pan_again_changes_the_one_rating(self):
        first = self.rate(self.ben, 2)
        second = self.rate(self.ben, 5)

        self.assertEqual(second.id, first.id)
        self.assertEqual(self.stored(), [(self.ben.id, self.pan.id, self.session.id, 5)])

    def test_half_stars_are_kept(self):
        self.rate(self.ben, 3.5)

        self.assertEqual(self.stored(), [(self.ben.id, self.pan.id, self.session.id, 3.5)])
        self.assertEqual(self.pan.rating, 3.5)

    def test_every_change_of_stars_reports_pan_rated(self):
        rating = self.rate(self.ben, 2)
        self.rate(self.ben, 2)
        self.rate(self.ben, 5)
        self.ratings.change(self.ben, rating.id, 5)
        self.ratings.change(self.ben, rating.id, 3)
        db.session.commit()

        self.assertEqual(self.achievements.facts, [self.rated(rating, self.ben)] * 3)
        self.assertEqual(self.stored(), [(self.ben.id, self.pan.id, self.session.id, 3)])

    def test_withdrawing_deletes_the_rating_and_reports_nothing(self):
        kept = self.rate(self.ana, 4)
        rating = self.rate(self.ben, 2)

        self.ratings.withdraw(self.ben, rating.id)
        db.session.commit()

        self.assertEqual(self.stored(), [(self.ana.id, self.pan.id, self.session.id, 4)])
        self.assertEqual(self.achievements.facts, [self.rated(kept, self.ana), self.rated(rating, self.ben)])

    def test_someone_elses_or_an_unknown_rating_is_reported_as_missing(self):
        rating = self.rate(self.ben, 2)

        for rating_id in (rating.id, 999):
            with self.subTest(rating_id=rating_id):
                with self.assertRaises(RatingNotFound):
                    self.ratings.change(self.ana, rating_id, 5)
                with self.assertRaises(RatingNotFound):
                    self.ratings.withdraw(self.ana, rating_id)
        db.session.commit()

        self.assertEqual(self.stored(), [(self.ben.id, self.pan.id, self.session.id, 2)])
        self.assertEqual(len(self.achievements.facts), 1)

    def test_a_rating_is_left_for_the_caller_to_commit(self):
        with self.assertRaises(RuntimeError):
            PanRatings(achievements=Exploding()).rate(self.ben, self.pan, 4)
        db.session.rollback()

        self.assertEqual(self.stored(), [])

    def best_rated_after(self, change: Callable[[Rating], object]) -> set[str | None]:
        """Ana's pan trails Dan's (3 to 4 stars) until Ben's rating changes from 2 to 5."""
        cara, dan = self.make_user("cara"), self.make_user("dan")
        rival = self.make_pan(dan, self.session, [self.make_ingredient(self.session, "Leek")])
        self.rate(self.ben, 4, pan=rival)
        self.rate(cara, 4, pan=rival)
        bens = self.rate(self.ben, 2)
        self.rate(cara, 4)
        self.assertNotIn("Pantastic", held(self.ana))

        change(bens)
        db.session.commit()
        return held(self.ana)

    def test_rating_a_pan_again_lets_achievements_react(self):
        self.assertIn("Pantastic", self.best_rated_after(lambda _: self.ratings.rate(self.ben, self.pan, 5)))

    def test_changing_a_rating_lets_achievements_react(self):
        self.assertIn("Pantastic", self.best_rated_after(lambda bens: self.ratings.change(self.ben, bens.id, 5)))
