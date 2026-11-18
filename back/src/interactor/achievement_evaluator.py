from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Literal, Optional, Tuple, Type

from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import Ingredient
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.rating import Rating
from back.src.entity.user import User


@dataclass(frozen=True)
class PanRolled:
    pan: Pan
    user: User
    session: RaclottoSession

    @property
    def actor(self) -> Optional[User]:
        return self.user


@dataclass(frozen=True)
class PanRated:
    rating: Rating
    pan: Pan
    rater: User
    session: RaclottoSession

    @property
    def actor(self) -> Optional[User]:
        return self.rater


@dataclass(frozen=True)
class IngredientAdded:
    ingredient: Ingredient
    user: User
    session: RaclottoSession

    @property
    def actor(self) -> Optional[User]:
        return self.user


@dataclass(frozen=True)
class CatalogChanged:
    """A session's ingredient catalog was replaced or merged."""

    session: RaclottoSession
    actor: Optional[User] = None


@dataclass(frozen=True)
class SessionClosed:
    session: RaclottoSession
    actor: Optional[User] = None


Fact = PanRolled | PanRated | IngredientAdded | CatalogChanged | SessionClosed

Audience = Literal["actor", "pan_owner", "session_members", "last_pan_owner"]
"""Whom an evaluator judges when a fact arrives:

* ``actor``: whoever caused the fact (roller, rater, ingredient author)
* ``pan_owner``: the owner of the pan the fact is about
* ``session_members``: everyone who has joined the fact's session
* ``last_pan_owner``: the owner of the most recent pan in the session
"""


@dataclass
class EvaluationContext:
    """Context information for evaluating achievements."""

    session: RaclottoSession
    user_pans: List[Pan]  # All pans created by the user
    session_pans: List[Pan]  # All pans in the current session
    user_ratings_count: int  # Total number of ratings given by user
    user_sessions_created: int  # Total number of sessions created by user


@dataclass
class EvaluationResult:
    """Result of an achievement evaluation."""

    unlocked: bool
    progress: Optional[float] = None  # 0.0-1.0, None if not applicable


class AchievementEvaluator(ABC):
    """Decides one achievement for one user.

    Subclasses declare which facts they react to (``reacts_to``), whom they
    judge (``audience``) and whether the achievement can be lost again
    (``revocable``). Most evaluators only implement ``evaluate`` for the pan
    named by the fact; evaluators for other facts override ``judge``.
    """

    reacts_to: Tuple[Type, ...] = (PanRolled,)
    revocable: bool = False

    def audience(self, fact: Fact) -> Audience:
        return "actor"

    def judge(
        self,
        fact: Fact,
        subject: User,
        achievement: Achievement,
        context: EvaluationContext,
    ) -> EvaluationResult:
        return self.evaluate(fact.pan, subject, context)

    def evaluate(
        self, pan: Pan, user: User, context: EvaluationContext
    ) -> EvaluationResult:
        raise NotImplementedError(
            f"{type(self).__name__} must implement evaluate() or judge()"
        )

    @abstractmethod
    def calculate_progress(
        self, user: User, achievement: Achievement, context: EvaluationContext
    ) -> Optional[float]:
        """Current progress (0.0-1.0) without any new fact, or None if untracked."""
