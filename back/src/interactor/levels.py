"""Levels: the XP a pan earns, the level that XP reaches, and what a user sees of their progress.

    reward = Levels().award(user, pan)     # XP and levels before and after
    progress = Levels().progress_of(user)  # the level shown and the next one
    level = Levels().starting()            # where a new user starts

A user without a stored level is shown the level their XP reaches, else the lowest; ``award``
starts from that shown level, so such a user still sees their first level-up. Callers own the
transaction: nothing here commits.
"""

from dataclasses import dataclass
from typing import Optional

from back.src.driver.database import db
from back.src.entity.level import Level
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.repository.level_repository import LevelRepository


@dataclass(frozen=True)
class LevelProgress:
    # None only while no levels exist.
    level: Optional[Level]
    # None at the highest level.
    next_level: Optional[Level]


@dataclass(frozen=True)
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


class Levels:
    def __init__(self) -> None:
        self._levels = LevelRepository()

    def starting(self) -> Optional[Level]:
        """The lowest level; None while no levels exist."""
        return next(iter(self._levels.all_ordered()), None)

    def progress_of(self, user: User) -> LevelProgress:
        """Read-only; levels are stored only on registration and when XP is awarded."""
        level = (
            user.level
            or self._levels.by_experience(int(user.experience_points or 0))
            or self.starting()
        )
        return LevelProgress(level=level, next_level=self._next(level))

    def award(self, user: User, pan: Pan) -> Reward:
        """Add the XP ``pan`` earns to ``user`` and store the level it reaches."""
        xp_before = int(user.experience_points or 0)
        previous_level = self.progress_of(user).level

        user.experience_points = xp_before + _xp_for(pan)
        reached = self._levels.by_experience(user.experience_points)
        if reached is not None:
            user.level_id = reached.id
        db.session.flush()

        level = self._levels.by_id(user.level_id) if user.level_id else None
        return Reward(
            xp_before=xp_before,
            xp_after=user.experience_points,
            previous_level=previous_level,
            level=level,
            next_level=self._next(level),
        )

    def _next(self, level: Optional[Level]) -> Optional[Level]:
        return self._levels.next_level(level) if level is not None else None


def _xp_for(pan: Pan) -> int:
    """10 plus 5 to 13 XP per ingredient, more per ingredient the fuller the pan.

    One combination multiplier applies, the highest: wildcard with spicy (spice ≥ 2) 1.7, wildcard
    1.5, spicy with sweet 1.25. A rolled preparation type adds ×1.1, rolled cheese ×1.2.
    """
    count = len(pan.ingredients)
    if count == 0:
        return 0
    if count <= 4:
        per_ingredient = 5
    elif count == 5:
        per_ingredient = 7
    elif count <= 7:
        per_ingredient = 9
    elif count <= 10:
        per_ingredient = 11
    else:
        per_ingredient = 13

    wildcard = any(bool(i.wildcard) for i in pan.ingredients)
    spicy = any(int(i.spicy) >= 2 for i in pan.ingredients)
    sweet = any(bool(i.sweet) for i in pan.ingredients)
    if spicy and wildcard:
        multiplier = 1.7
    elif wildcard:
        multiplier = 1.5
    elif spicy and sweet:
        multiplier = 1.25
    else:
        multiplier = 1.0
    if pan.rolled_preparation_type:
        multiplier *= 1.1
    if pan.rolled_cheese:
        multiplier *= 1.2

    return int((count * per_ingredient + 10) * multiplier)
