"""Pan ratings: rate a pan, change or withdraw your own rating, and let achievements react.

    rating = PanRatings().rate(user, pan, stars)
    PanRatings().change(user, rating_id, stars)
    PanRatings().withdraw(user, rating_id)

A rater has one rating per pan, and only the rater can change or withdraw it: anyone else's
rating is reported as missing. Every rating that changes a pan's stars reports ``PanRated``
in the same transaction; withdrawing reports nothing, since no achievement can be lost
through ratings. Changes are flushed; the endpoint commits the request's transaction (ADR 0008).
"""

from back.src.driver.database import db
from back.src.entity.pan import Pan
from back.src.entity.rating import Rating
from back.src.entity.user import User
from back.src.interactor.achievements import Achievements
from back.src.interactor.facts import PanRated
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository


class RatingNotFound(Exception):
    """No rating with that id belongs to the rater."""


class PanRatings:
    def __init__(self, achievements: Achievements | None = None):
        self._achievements = achievements or Achievements()
        self._pans = PanRepository()
        self._ratings = RatingRepository()

    def rate(self, rater: User, pan: Pan, stars: float) -> Rating:
        """The rater's rating of ``pan``, created or changed to ``stars``."""
        rating = self._ratings.by_user_and_pan(rater.id, pan.id)
        if rating is None:
            rating = Rating(rating=stars, user_id=rater.id, pan_id=pan.id, session_id=pan.session_id)
            db.session.add(rating)
            self._rated(rater, rating, pan)
        else:
            self._restar(rater, rating, stars)
        return rating

    def change(self, rater: User, rating_id: int, stars: float) -> Rating:
        rating = self._own(rater, rating_id)
        self._restar(rater, rating, stars)
        return rating

    def withdraw(self, rater: User, rating_id: int) -> None:
        db.session.delete(self._own(rater, rating_id))
        db.session.flush()

    def _own(self, rater: User, rating_id: int) -> Rating:
        rating = self._ratings.by_id(rating_id)
        if rating is None or rating.user_id != rater.id:
            raise RatingNotFound(rating_id)
        return rating

    def _restar(self, rater: User, rating: Rating, stars: float) -> None:
        if rating.rating == stars:
            return
        rating.rating = stars
        pan = self._pans.by_id(rating.pan_id)
        # SQLite doesn't enforce the foreign key, so a legacy rating may outlive its pan.
        if pan is not None:
            self._rated(rater, rating, pan)
        else:
            db.session.flush()

    def _rated(self, rater: User, rating: Rating, pan: Pan) -> None:
        db.session.flush()
        self._achievements.record(PanRated(rating=rating, pan=pan, rater=rater, session=pan.session))
