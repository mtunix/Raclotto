"""Achievements: tell the module what happened, get back what changed.

    changes = Achievements().record(PanRolled(pan, user, session))
    changes.unlocked_for(user.id)  # -> [Achievement, ...]

Which evaluators react to which fact, whom they judge, whether an
achievement can be lost again, how progress is stored and how evaluation
context is built all live behind ``record``. Callers own the transaction:
``record`` flushes but never commits.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Mapping, Optional, Tuple

from back.src.driver.database import db
from back.src.entity.achievement import Achievement
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    CatalogChanged,
    EvaluationContext,
    Fact,
    IngredientAdded,
    PanRated,
    PanRolled,
    SessionClosed,
)
from back.src.interactor.achievement_registry import get_registry
from back.src.repository.achievement_repository import AchievementRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository
from back.src.repository.session_repository import SessionRepository
from back.src.repository.user_achievement_progress_repository import (
    UserAchievementProgressRepository,
)
from back.src.repository.user_repository import UserRepository

__all__ = [
    "Achievements",
    "AchievementChanges",
    "AchievementStatus",
    "PanRolled",
    "PanRated",
    "IngredientAdded",
    "CatalogChanged",
    "SessionClosed",
]


@dataclass
class AchievementChanges:
    unlocked: List[Tuple[int, Achievement]] = field(default_factory=list)
    revoked: List[Tuple[int, Achievement]] = field(default_factory=list)

    def unlocked_for(self, user_id: int) -> List[Achievement]:
        return [a for uid, a in self.unlocked if uid == user_id]

    def revoked_for(self, user_id: int) -> List[Achievement]:
        return [a for uid, a in self.revoked if uid == user_id]


@dataclass
class AchievementStatus:
    achievement: Achievement
    unlocked: bool
    progress: Optional[float]


class Achievements:
    def __init__(self, evaluators: Optional[Mapping[str, AchievementEvaluator]] = None):
        """``evaluators`` maps achievement title to evaluator; defaults to the app registry."""
        self._evaluators = evaluators if evaluators is not None else get_registry().evaluators
        self._achievements = AchievementRepository()
        self._users = UserRepository()
        self._pans = PanRepository()
        self._ratings = RatingRepository()
        self._sessions = SessionRepository()
        self._progress = UserAchievementProgressRepository()

    def record(self, fact: Fact) -> AchievementChanges:
        """Judge every achievement that reacts to ``fact``; unlock, revoke and store progress."""
        # Relationship collections loaded earlier in the request (pan.ratings,
        # user.achievements, ...) may predate the fact; reload them.
        db.session.flush()
        db.session.expire_all()

        changes = AchievementChanges()
        contexts: Dict[int, EvaluationContext] = {}

        for achievement in self._achievements.all():
            evaluator = self._evaluators.get(achievement.title)
            if evaluator is None or not isinstance(fact, evaluator.reacts_to):
                continue

            for subject in self._audience(evaluator.audience(fact), fact):
                held = achievement in subject.achievements
                if held and not evaluator.revocable:
                    continue

                if subject.id not in contexts:
                    contexts[subject.id] = self._context(subject, fact.session)
                result = evaluator.judge(fact, subject, achievement, contexts[subject.id])

                if result.unlocked and not held:
                    subject.achievements.append(achievement)
                    self._progress.create_or_update(subject.id, achievement.id, 1.0)
                    changes.unlocked.append((subject.id, achievement))
                    continue
                if not result.unlocked and held:
                    subject.achievements.remove(achievement)
                    changes.revoked.append((subject.id, achievement))
                if result.progress is not None:
                    self._progress.create_or_update(subject.id, achievement.id, result.progress)

        db.session.flush()
        return changes

    def statuses(self, user: User) -> List[AchievementStatus]:
        """Every achievement with the user's unlocked flag and progress. Read-only."""
        held = {a.id for a in user.achievements}
        session = self._latest_session(user)
        context = self._context(user, session) if session else None

        statuses = []
        for achievement in self._achievements.all():
            stored = self._progress.by_user_and_achievement(user.id, achievement.id)
            progress = stored.progress_value if stored else None
            if progress is None and context is not None:
                evaluator = self._evaluators.get(achievement.title)
                if evaluator is not None:
                    progress = evaluator.calculate_progress(user, achievement, context)
            statuses.append(AchievementStatus(achievement, achievement.id in held, progress))
        return statuses

    def _audience(self, audience: str, fact: Fact) -> List[User]:
        if audience == "actor":
            return [fact.actor] if fact.actor is not None else []
        if audience == "pan_owner":
            owner = self._users.by_id(fact.pan.user_id)
            return [owner] if owner else []
        if audience == "session_members":
            ids = set(self._users.get_users_in_session(fact.session.id))
            if fact.actor is not None:
                ids.add(fact.actor.id)
            return [u for u in (self._users.by_id(i) for i in sorted(ids)) if u]
        if audience == "last_pan_owner":
            timed = [p for p in self._pans.by_session(fact.session.key) if p.timestamp]
            if not timed:
                return []
            owner = self._users.by_id(max(timed, key=lambda p: p.timestamp).user_id)
            return [owner] if owner else []
        raise ValueError(f"Unknown audience {audience!r}")

    def _context(self, user: User, session: RaclottoSession) -> EvaluationContext:
        return EvaluationContext(
            session=session,
            user_pans=self._pans.by_user(user.id),
            session_pans=self._pans.by_session(session.key),
            user_ratings_count=self._ratings.count_by_user(user.id),
            user_sessions_created=len(self._sessions.by_creator(user.id)),
        )

    def _latest_session(self, user: User) -> Optional[RaclottoSession]:
        latest = self._pans.by_user(user.id, limit=1)
        if latest:
            return self._sessions.by_id(latest[0].session_id)
        return user.sessions[-1] if user.sessions else None
