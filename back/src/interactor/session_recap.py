"""Session recap: what a session came to, for the screen shown when it closes.

    recap = SessionRecaps().of(session)

The best and the worst pan are the rated ones with the highest and the lowest average stars; a
tie goes to the pan with more ratings, then to the earlier one. A worst pan is named only once two
pans are rated. The boldest pan is the one that earned the most XP. Participants are the session's
members and anyone who rolled there, most XP first; their XP is what their pans in this session
earned. Read-only.
"""

from collections import Counter
from dataclasses import dataclass
from datetime import datetime

from back.src.entity.ingredient import Ingredient
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.levels import Levels
from back.src.repository.pan_repository import PanRepository
from back.src.repository.user_repository import UserRepository


@dataclass(frozen=True)
class Participant:
    user: User
    pan_count: int
    xp: int
    # Average stars of their rated pans; None while none is rated.
    average_rating: float | None
    ratings_given: int


@dataclass(frozen=True)
class Recap:
    session: RaclottoSession
    pan_count: int
    rating_count: int
    last_pan_at: datetime | None
    best_pan: Pan | None
    worst_pan: Pan | None
    boldest_pan: Pan | None
    boldest_pan_xp: int
    favorite_ingredient: Ingredient | None
    favorite_ingredient_pans: int
    participants: list[Participant]
    # Authors of the pans named above, by id.
    authors: dict[int, User]


class SessionRecaps:
    def __init__(self, levels: Levels | None = None):
        self._levels = levels or Levels()
        self._pans = PanRepository()
        self._users = UserRepository()

    def of(self, session: RaclottoSession) -> Recap:
        pans = sorted(self._pans.by_session(session.key), key=lambda pan: (pan.timestamp, pan.id))
        xp = {pan.id: self._levels.xp_for(pan) for pan in pans}
        ratings = [rating for pan in pans for rating in pan.ratings]
        rated = [pan for pan in pans if pan.ratings]

        # max and min keep the first of equals, and the pans are oldest first.
        best = max(rated, key=lambda pan: (pan.rating, len(pan.ratings)), default=None)
        worst = min(
            (pan for pan in rated if pan is not best), key=lambda pan: (pan.rating, -len(pan.ratings)), default=None
        )
        boldest = max(pans, key=lambda pan: xp[pan.id], default=None)

        uses = Counter(ingredient.id for pan in pans for ingredient in pan.ingredients)
        ingredients = {ingredient.id: ingredient for pan in pans for ingredient in pan.ingredients}
        favorite_id, favorite_pans = uses.most_common(1)[0] if uses else (None, 0)

        user_ids = self._users.get_users_in_session(session.id) | {pan.user_id for pan in pans}
        users = self._users.by_ids(user_ids)
        given = Counter(rating.user_id for rating in ratings)
        participants = [
            self._participant(user, [pan for pan in pans if pan.user_id == user.id], xp, given[user.id])
            for user in users.values()
        ]
        participants.sort(key=lambda p: (-p.xp, -p.pan_count, p.user.name))

        return Recap(
            session=session,
            pan_count=len(pans),
            rating_count=len(ratings),
            last_pan_at=pans[-1].timestamp if pans else None,
            best_pan=best,
            worst_pan=worst,
            boldest_pan=boldest,
            boldest_pan_xp=xp[boldest.id] if boldest else 0,
            favorite_ingredient=ingredients[favorite_id] if favorite_id is not None else None,
            favorite_ingredient_pans=favorite_pans,
            participants=participants,
            authors=users,
        )

    @staticmethod
    def _participant(user: User, pans: list[Pan], xp: dict[int, int], ratings_given: int) -> Participant:
        rated = [pan.rating for pan in pans if pan.ratings]
        return Participant(
            user=user,
            pan_count=len(pans),
            xp=sum(xp[pan.id] for pan in pans),
            average_rating=sum(rated) / len(rated) if rated else None,
            ratings_given=ratings_given,
        )
