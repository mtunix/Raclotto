"""Stats: the dashboard of one session, or of all of them.

    dashboard = Stats().of(session_key)   # None: every session

The newest pans (thirty of one session, ten of all), the ten ingredients in the best rated pans and
the ten in the most pans, a session's twenty newest events for its feed, whoever dismissed them, and
the leaderboard, which is always global: an unknown session has nothing but the leaderboard.
Read-only.
"""

from dataclasses import dataclass, field

from back.src.entity.event import Event
from back.src.entity.ingredient import Ingredient
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.repository.achievement_repository import AchievementRepository
from back.src.repository.event_repository import EventRepository
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.session_repository import SessionRepository
from back.src.repository.user_repository import UserRepository

LIMIT = 10
SESSION_PANS = 30
SESSION_EVENTS = 20


@dataclass(frozen=True)
class Dashboard:
    # (user_id, name, total_points, achievement_count), best first.
    standings: list[tuple[int, str, int, int]]
    pans: list[Pan] = field(default_factory=list)
    # Authors of the pans, by id.
    authors: dict[int, User] = field(default_factory=dict)
    # With the average stars of the pans the ingredient was in.
    top_rated: list[tuple[Ingredient, float]] = field(default_factory=list)
    # With the number of pans the ingredient was in.
    most_used: list[tuple[Ingredient, int]] = field(default_factory=list)
    # Newest first; only of a session.
    events: list[Event] = field(default_factory=list)


class Stats:
    def __init__(self) -> None:
        self._achievements = AchievementRepository()
        self._events = EventRepository()
        self._ingredients = IngredientRepository()
        self._pans = PanRepository()
        self._sessions = SessionRepository()
        self._users = UserRepository()

    def of(self, session_key: str | None) -> Dashboard:
        standings = self._achievements.standings()
        session_id = None
        if session_key is not None:
            session = self._sessions.by_key(session_key)
            if session is None:
                return Dashboard(standings=standings)
            session_id = session.id

        pans = self._pans.get_recent_pans(session_key=session_key, limit=SESSION_PANS if session_id else LIMIT)
        return Dashboard(
            standings=standings,
            pans=pans,
            authors=self._users.by_ids(pan.user_id for pan in pans),
            top_rated=[
                (ingredient, float(average or 0))
                for ingredient, average in self._ingredients.get_top_rated(session_id, limit=LIMIT)
            ],
            most_used=[
                (ingredient, int(count or 0))
                for ingredient, count in self._ingredients.get_most_used(session_id, limit=LIMIT)
            ],
            events=self._events.recent(session_id, SESSION_EVENTS) if session_id is not None else [],
        )
