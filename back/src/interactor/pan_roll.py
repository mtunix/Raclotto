"""Pan roll: a user rolls a pan in a session and gets back everything that happened.

    outcome = PanRoll().roll(user, session_key, RollOptions(total_columns=4))
    outcome.pan, outcome.reward, outcome.achievements, outcome.events

Behind ``roll``: diet eligibility, the fill/sauce split, sampling, naming,
preparation type and cheese rolls, session membership, achievements,
events, XP and level. Sampling makes what the user got in their last pans
in the session less likely (``RECENT_WEIGHTS``), and a generated name's
adjective is unique within the session while the word list lasts. ``roll`` flushes but never commits: the request's
transaction holds all of it, so a failure anywhere, building the response
included, leaves nothing behind. Randomness comes from an injectable
``random.Random`` so tests can seed it.
"""

import random
from collections.abc import Callable, Collection, Sequence
from dataclasses import dataclass, field
from functools import cache

from wonderwords import RandomWord

from back.src.driver.database import db
from back.src.entity.achievement import Achievement
from back.src.entity.event import Event
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.achievements import Achievements, PanRolled
from back.src.interactor.diet import Diet
from back.src.interactor.events import Events
from back.src.interactor.levels import Levels, Reward
from back.src.interactor.sessions import Sessions
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.preparation_type_repository import PreparationTypeRepository
from back.src.repository.session_repository import SessionRepository


@dataclass(frozen=True)
class RollOptions:
    """What the user asked for. Give exactly one of:

    * ``num_fill`` / ``num_sauce``: classic roll with fixed counts
    * ``total_columns``: bandit roll, the fill/sauce split is random
    * ``ingredient_ids``: a hand-picked pan
    """

    num_fill: int | None = None
    num_sauce: int | None = None
    total_columns: int | None = None
    ingredient_ids: Sequence[int] | None = None
    name: str | None = None
    preparation_type_id: int | None = None
    roll_preparation_type: bool = False
    roll_cheese: bool = False


class RollError(Exception):
    """The roll could not happen. ``kind`` says why."""

    SESSION_NOT_FOUND = "session_not_found"
    PREPARATION_TYPE_NOT_FOUND = "preparation_type_not_found"
    PREPARATION_TYPE_NOT_IN_SESSION = "preparation_type_not_in_session"
    NO_INGREDIENTS = "no_ingredients"
    INVALID_OPTIONS = "invalid_options"

    def __init__(self, kind: str, detail: str):
        super().__init__(detail)
        self.kind = kind
        self.detail = detail


@dataclass
class RollOutcome:
    pan: Pan
    reward: Reward
    achievements: list[Achievement] = field(default_factory=list)
    events: list[Event] = field(default_factory=list)


def split_columns(total: int, fills_available: int, sauces_available: int, rng: random.Random) -> tuple[int, int]:
    """Randomly split ``total`` columns into (fills, sauces).

    Never exceeds what is available, never exceeds ``total``, and gives at
    least one of each type when both exist and there are two or more columns.
    """
    total = min(total, fills_available + sauces_available)
    if total <= 0:
        return 0, 0
    if fills_available == 0:
        return 0, total
    if sauces_available == 0:
        return total, 0
    if total == 1:
        return 1, 0

    fills = 1 + rng.randint(0, total - 2)
    sauces = total - fills
    if fills > fills_available:
        fills, sauces = fills_available, total - fills_available
    if sauces > sauces_available:
        fills, sauces = total - sauces_available, sauces_available
    return fills, sauces


# The weight of an ingredient that was in the user's newest pan in the session, and in the one before.
RECENT_WEIGHTS = (0.2, 0.5)
PAN_NAME_SUFFIX = " Raclotto Pan"


def weighted_sample[T](population: Sequence[T], k: int, weight: Callable[[T], float], rng: random.Random) -> list[T]:
    """``k`` distinct items, each drawn with a chance proportional to its weight (Efraimidis-Spirakis)."""
    keyed = sorted(population, key=lambda item: rng.random() ** (1 / weight(item)), reverse=True)
    return keyed[:k]


@cache
def _adjectives() -> tuple[str, ...]:
    words = RandomWord().filter(include_parts_of_speech=["adjectives"])
    return tuple(sorted({word.capitalize() for word in words}))


def unique_pan_name(taken: Collection[str], rng: random.Random) -> str:
    """A generated name whose adjective no name in ``taken`` has; any adjective once all are used."""
    used = {name.removesuffix(PAN_NAME_SUFFIX).casefold() for name in taken if name.endswith(PAN_NAME_SUFFIX)}
    fresh = [adjective for adjective in _adjectives() if adjective.casefold() not in used]
    return f"{rng.choice(fresh or _adjectives())}{PAN_NAME_SUFFIX}"


class PanRoll:
    def __init__(
        self,
        rng: random.Random | None = None,
        name_pan: Callable[[Collection[str]], str] | None = None,
        achievements: Achievements | None = None,
        events: Events | None = None,
    ):
        self._rng = rng or random.Random()
        self._name_pan = name_pan or (lambda taken: unique_pan_name(taken, self._rng))
        self._achievements = achievements or Achievements()
        self._events = events or Events()
        self._sessions = SessionRepository()
        self._ingredients = IngredientRepository()
        self._pans = PanRepository()
        self._prep_types = PreparationTypeRepository()
        self._levels = Levels()
        self._membership = Sessions(achievements=self._achievements)

    def roll(self, user: User, session_key: str, options: RollOptions) -> RollOutcome:
        session = self._sessions.by_key(session_key)
        if not session:
            raise RollError(RollError.SESSION_NOT_FOUND, "The specified session does not exist")

        ingredients = self._choose_ingredients(user, session, options)
        prep_type_id, rolled_prep_type = self._preparation_type(session, options)
        cheese_level = self._rng.randint(0, 9) if options.roll_cheese else None

        self._membership.join(user, session)
        pan = Pan(
            name=options.name or self._name_pan(self._pans.names_in_session(session.id)),
            ingredients=ingredients,
            user_id=user.id,
            session_id=session.id,
            preparation_type_id=prep_type_id,
            cheese_level=cheese_level,
            rolled_preparation_type=rolled_prep_type,
            rolled_cheese=options.roll_cheese,
        )
        db.session.add(pan)
        db.session.flush()

        reward = self._levels.award(user, pan)

        rolled = PanRolled(pan=pan, user=user, session=session)
        events = self._events.record(rolled)
        changes = self._achievements.record(rolled)

        return RollOutcome(
            pan=pan,
            reward=reward,
            achievements=changes.unlocked_for(user.id),
            events=events,
        )

    def _choose_ingredients(self, user: User, session: RaclottoSession, options: RollOptions) -> list[Ingredient]:
        if options.ingredient_ids is not None:
            return self._picked(session, options.ingredient_ids)

        diet = Diet.of(user)
        fills = self._ingredients.filter_by_preferences(session.key, diet, IngredientType.FILL)
        sauces = self._ingredients.filter_by_preferences(session.key, diet, IngredientType.SAUCE)

        if options.total_columns is not None:
            if options.total_columns < 1:
                raise RollError(RollError.INVALID_OPTIONS, "total_columns must be at least 1")
            if not fills and not sauces:
                raise RollError(
                    RollError.NO_INGREDIENTS,
                    "No available ingredients found for this session",
                )
            num_fill, num_sauce = split_columns(options.total_columns, len(fills), len(sauces), self._rng)
        else:
            num_fill = min(max(options.num_fill if options.num_fill is not None else 3, 0), len(fills))
            num_sauce = min(max(options.num_sauce if options.num_sauce is not None else 2, 0), len(sauces))

        if num_fill == 0 and num_sauce == 0:
            raise RollError(
                RollError.NO_INGREDIENTS,
                "At least one fill or sauce ingredient must be selected",
            )

        weight = self._recency_weight(user, session)
        return weighted_sample(fills, num_fill, weight, self._rng) + weighted_sample(
            sauces, num_sauce, weight, self._rng
        )

    def _recency_weight(self, user: User, session: RaclottoSession) -> Callable[[Ingredient], float]:
        weights: dict[int, float] = {}
        recent = self._pans.latest_of_user(session.id, user.id, limit=len(RECENT_WEIGHTS))
        for pan, pan_weight in reversed(list(zip(recent, RECENT_WEIGHTS, strict=False))):
            for ingredient in pan.ingredients:
                weights[ingredient.id] = pan_weight
        return lambda ingredient: weights.get(ingredient.id, 1.0)

    @staticmethod
    def _picked(session: RaclottoSession, ids: Sequence[int]) -> list[Ingredient]:
        if not ids:
            raise RollError(RollError.INVALID_OPTIONS, "ingredients must be a non-empty list")
        found = (
            db.session.query(Ingredient).filter(Ingredient.id.in_(list(ids)), Ingredient.session_id == session.id).all()
        )
        if not found:
            raise RollError(RollError.NO_INGREDIENTS, "None of the given ingredients exist in this session")
        return found

    def _preparation_type(self, session: RaclottoSession, options: RollOptions) -> tuple[int | None, bool]:
        if options.roll_preparation_type:
            available = self._prep_types.by_session(session.id)
            if available:
                return self._rng.choice(available).id, True
            return None, False
        if options.preparation_type_id:
            prep_type = self._prep_types.by_id(options.preparation_type_id)
            if not prep_type:
                raise RollError(
                    RollError.PREPARATION_TYPE_NOT_FOUND,
                    "The specified preparation type does not exist",
                )
            if prep_type.session_id is not None and prep_type.session_id != session.id:
                raise RollError(
                    RollError.PREPARATION_TYPE_NOT_IN_SESSION,
                    "The specified preparation type is not available for this session",
                )
            return prep_type.id, False
        return None, False
