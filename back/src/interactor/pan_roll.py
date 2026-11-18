"""Pan roll: a user rolls a pan in a session and gets back everything that happened.

    outcome = PanRoll().roll(user, session_key, RollOptions(total_columns=4))
    outcome.pan, outcome.reward, outcome.achievements, outcome.events

Behind ``roll``: diet eligibility, the fill/sauce split, sampling, naming,
preparation type and cheese rolls, session membership, achievements,
events, XP and level, all inside one transaction. ``roll`` commits on
success and rolls back on failure. ``roll_into`` also turns the outcome
into something else (a response) before committing, so a failure there
rolls the roll back too. Randomness comes from an injectable
``random.Random`` so tests can seed it.
"""

import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, List, Optional, Sequence, Tuple, TypeVar

from wonderwords import RandomWord

from back.src.driver.database import db
from back.src.entity.achievement import Achievement
from back.src.entity.event import Event
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.level import Level
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User, user_sessions
from back.src.interactor.achievements import Achievements, PanRolled
from back.src.interactor.diet import Diet
from back.src.interactor.event_service import EventService
from back.src.interactor.level_service import LevelService
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.level_repository import LevelRepository
from back.src.repository.preparation_type_repository import PreparationTypeRepository
from back.src.repository.session_repository import SessionRepository

T = TypeVar("T")


@dataclass(frozen=True)
class RollOptions:
    """What the user asked for. Give exactly one of:

    * ``num_fill`` / ``num_sauce``: classic roll with fixed counts
    * ``total_columns``: bandit roll, the fill/sauce split is random
    * ``ingredient_ids``: a hand-picked pan
    """

    num_fill: Optional[int] = None
    num_sauce: Optional[int] = None
    total_columns: Optional[int] = None
    ingredient_ids: Optional[Sequence[int]] = None
    name: Optional[str] = None
    preparation_type_id: Optional[int] = None
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
class Reward:
    xp_before: int
    xp_after: int
    previous_level: Optional[Level]
    level: Optional[Level]
    next_level: Optional[Level]

    @property
    def xp_gained(self) -> int:
        return self.xp_after - self.xp_before

    @property
    def leveled_up(self) -> bool:
        return (
            self.previous_level is not None
            and self.level is not None
            and self.level.id != self.previous_level.id
        )


@dataclass
class RollOutcome:
    pan: Pan
    reward: Reward
    achievements: List[Achievement] = field(default_factory=list)
    events: List[Event] = field(default_factory=list)


def split_columns(
    total: int, fills_available: int, sauces_available: int, rng: random.Random
) -> Tuple[int, int]:
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


def _random_pan_name() -> str:
    adjective = RandomWord().word(include_parts_of_speech=["adjectives"])
    return f"{adjective.capitalize()} Raclotto Pan"


class PanRoll:
    def __init__(
        self,
        rng: Optional[random.Random] = None,
        name_pan: Callable[[], str] = _random_pan_name,
        achievements: Optional[Achievements] = None,
    ):
        self._rng = rng or random.Random()
        self._name_pan = name_pan
        self._achievements = achievements or Achievements()
        self._sessions = SessionRepository()
        self._ingredients = IngredientRepository()
        self._prep_types = PreparationTypeRepository()
        self._levels = LevelRepository()

    def roll(self, user: User, session_key: str, options: RollOptions) -> RollOutcome:
        return self.roll_into(user, session_key, options, lambda outcome: outcome)

    def roll_into(
        self, user: User, session_key: str, options: RollOptions, present: Callable[[RollOutcome], T]
    ) -> T:
        try:
            result = present(self._roll(user, session_key, options))
            db.session.commit()
            return result
        except Exception:
            db.session.rollback()
            raise

    def _roll(self, user: User, session_key: str, options: RollOptions) -> RollOutcome:
        session = self._sessions.by_key(session_key)
        if not session:
            raise RollError(RollError.SESSION_NOT_FOUND, "The specified session does not exist")

        ingredients = self._choose_ingredients(user, session, options)
        prep_type_id, rolled_prep_type = self._preparation_type(session, options)
        cheese_level = self._rng.randint(0, 9) if options.roll_cheese else None

        self._ensure_member(user, session)
        pan = Pan(
            name=options.name or self._name_pan(),
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

        xp_before = int(user.experience_points or 0)
        levels = LevelService()
        # As the profile shows it, so a user without a stored level still sees their first level-up.
        previous_level = levels.progress_of(user).level
        levels.award_xp_for_pan(user, pan)
        level = self._levels.by_id(user.level_id) if user.level_id else None
        reward = Reward(
            xp_before=xp_before,
            xp_after=int(user.experience_points),
            previous_level=previous_level,
            level=level,
            next_level=self._levels.next_level(level) if level else None,
        )

        events = EventService().evaluate_events_for_session(session, {"pan": pan})
        changes = self._achievements.record(PanRolled(pan=pan, user=user, session=session))

        return RollOutcome(
            pan=pan,
            reward=reward,
            achievements=changes.unlocked_for(user.id),
            events=events,
        )

    def _choose_ingredients(
        self, user: User, session: RaclottoSession, options: RollOptions
    ) -> List[Ingredient]:
        if options.ingredient_ids is not None:
            return self._picked(session, options.ingredient_ids)

        diet = Diet.of(user)
        fills = self._ingredients.filter_by_preferences(session.key, diet, IngredientType.FILL)
        sauces = self._ingredients.filter_by_preferences(session.key, diet, IngredientType.SAUCE)

        if options.total_columns is not None:
            if options.total_columns < 1:
                raise RollError(
                    RollError.INVALID_OPTIONS, "total_columns must be at least 1"
                )
            if not fills and not sauces:
                raise RollError(
                    RollError.NO_INGREDIENTS,
                    "No available ingredients found for this session",
                )
            num_fill, num_sauce = split_columns(
                options.total_columns, len(fills), len(sauces), self._rng
            )
        else:
            num_fill = min(max(options.num_fill if options.num_fill is not None else 3, 0), len(fills))
            num_sauce = min(max(options.num_sauce if options.num_sauce is not None else 2, 0), len(sauces))

        if num_fill == 0 and num_sauce == 0:
            raise RollError(
                RollError.NO_INGREDIENTS,
                "At least one fill or sauce ingredient must be selected",
            )
        return self._rng.sample(fills, num_fill) + self._rng.sample(sauces, num_sauce)

    @staticmethod
    def _picked(session: RaclottoSession, ids: Sequence[int]) -> List[Ingredient]:
        if not ids:
            raise RollError(RollError.INVALID_OPTIONS, "ingredients must be a non-empty list")
        found = (
            db.session.query(Ingredient)
            .filter(Ingredient.id.in_(list(ids)), Ingredient.session_id == session.id)
            .all()
        )
        if not found:
            raise RollError(RollError.NO_INGREDIENTS, "None of the given ingredients exist in this session")
        return found

    def _preparation_type(
        self, session: RaclottoSession, options: RollOptions
    ) -> Tuple[Optional[int], bool]:
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

    @staticmethod
    def _ensure_member(user: User, session: RaclottoSession) -> None:
        is_member = (
            db.session.query(user_sessions)
            .filter(
                user_sessions.c.user_id == user.id,
                user_sessions.c.session_id == session.id,
            )
            .first()
        )
        if not is_member:
            db.session.execute(
                user_sessions.insert().values(
                    user_id=user.id, session_id=session.id, joined_at=datetime.now()
                )
            )
