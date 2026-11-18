from typing import Iterable, Tuple

from back.src.dto.base import ResponseDto
from back.src.interactor.achievements import AchievementStatus


class AchievementDto(ResponseDto):
    # The columns are nullable, but every achievement is seeded from default_data with all of them set.
    id: int
    title: str
    description: str
    value: int
    hidden: bool
    is_global: bool


class AchievementStatusDto(AchievementDto):
    """An achievement and how far the signed-in user is with it."""

    unlocked: bool
    # 0 to 1; null while nothing tracks it for the user.
    progress: float | None

    @classmethod
    def of(cls, status: AchievementStatus) -> "AchievementStatusDto":
        return cls(
            **AchievementDto.model_validate(status.achievement).model_dump(),
            unlocked=status.unlocked,
            progress=status.progress,
        )


class LeaderboardEntryDto(ResponseDto):
    # Position in the list from 1; users with equal points get consecutive ranks by name.
    rank: int
    user_id: int
    name: str
    # Sum of the values of the user's achievements.
    total_points: int
    achievement_count: int

    @classmethod
    def ranking(cls, standings: Iterable[Tuple[int, str, int, int]]) -> list["LeaderboardEntryDto"]:
        """Entries for (user_id, name, total_points, achievement_count) rows, best first."""
        return [
            cls(rank=rank, user_id=user_id, name=name, total_points=points, achievement_count=count)
            for rank, (user_id, name, points, count) in enumerate(standings, start=1)
        ]
