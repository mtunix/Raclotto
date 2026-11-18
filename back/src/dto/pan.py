from datetime import datetime
from typing import Optional

from pydantic import Field, model_validator

from back.src.dto.achievement import AchievementDto
from back.src.dto.base import RequestDto, ResponseDto
from back.src.dto.event import EventDto
from back.src.dto.ingredient import IngredientDto
from back.src.dto.level import LevelDto
from back.src.dto.preparation_type import PrepTypeDto
from back.src.dto.rating import RatingDto
from back.src.dto.user import UserSummaryDto
from back.src.entity.level import Level
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.interactor.pan_roll import Reward, RollOutcome


class PanDto(ResponseDto):
    id: int
    # Null for pans the old API renamed to null; new and renamed ones always have one.
    name: str | None
    user_id: int
    session_id: int
    timestamp: datetime
    snacked: bool
    preparation_type_id: int | None
    preparation_type: PrepTypeDto | None
    cheese_level: int | None
    rolled_preparation_type: bool
    rolled_cheese: bool
    # Average of `ratings`, 0 when there are none.
    rating: float
    ratings: list[RatingDto]
    ingredients: list[IngredientDto]
    # Null only when the author's user row is gone.
    author: UserSummaryDto | None

    @classmethod
    def of(cls, pan: Pan, author: Optional[User]) -> "PanDto":
        return cls(
            id=pan.id,
            name=pan.name,
            user_id=pan.user_id,
            session_id=pan.session_id,
            timestamp=pan.timestamp,
            snacked=pan.snacked,
            preparation_type_id=pan.preparation_type_id,
            preparation_type=PrepTypeDto.model_validate(pan.preparation_type) if pan.preparation_type else None,
            cheese_level=pan.cheese_level,
            rolled_preparation_type=pan.rolled_preparation_type,
            rolled_cheese=pan.rolled_cheese,
            rating=pan.rating,
            ratings=[RatingDto.model_validate(rating) for rating in pan.ratings],
            ingredients=[IngredientDto.model_validate(ingredient) for ingredient in pan.ingredients],
            author=UserSummaryDto.of(author) if author is not None else None,
        )


class PanPageDto(ResponseDto):
    items: list[PanDto]
    total: int
    # Null when the request asked for all pans.
    limit: int | None
    offset: int
    has_more: bool


def _level(level: Optional[Level]) -> Optional[LevelDto]:
    return LevelDto.model_validate(level) if level is not None else None


class RewardDto(ResponseDto):
    xp_gained: int
    xp_before: int
    xp_after: int
    previous_level: LevelDto | None
    level: LevelDto | None
    next_level: LevelDto | None
    leveled_up: bool

    @classmethod
    def of(cls, reward: Reward) -> "RewardDto":
        return cls(
            xp_gained=reward.xp_gained,
            xp_before=reward.xp_before,
            xp_after=reward.xp_after,
            previous_level=_level(reward.previous_level),
            level=_level(reward.level),
            next_level=_level(reward.next_level),
            leveled_up=reward.leveled_up,
        )


class RollOutcomeDto(ResponseDto):
    """The rolled pan and everything the roll caused for the roller."""

    pan: PanDto
    reward: RewardDto
    achievements: list[AchievementDto]
    events: list[EventDto]

    @classmethod
    def of(cls, outcome: RollOutcome, roller: User) -> "RollOutcomeDto":
        return cls(
            pan=PanDto.of(outcome.pan, roller),
            reward=RewardDto.of(outcome.reward),
            achievements=[AchievementDto.model_validate(a) for a in outcome.achievements],
            events=[EventDto.model_validate(e) for e in outcome.events],
        )


class RollQuery(RequestDto):
    session_key: str = Field(min_length=1)


class RollPanBody(RequestDto):
    num_fill: int = Field(default=3, ge=0)
    num_sauce: int = Field(default=2, ge=0)
    preparation_type_id: int | None = None
    roll_prep_type: bool = False
    roll_cheese: bool = False


class RollBanditPanBody(RequestDto):
    total_columns: int = Field(ge=1)
    roll_prep_type: bool = False
    roll_cheese: bool = False


class CreatePanBody(RequestDto):
    """A hand-picked pan; ingredients outside the session are ignored."""

    ingredients: list[int] = Field(min_length=1)
    # Empty or missing: a random name.
    name: str | None = None


class ListPansQuery(RequestDto):
    session_key: str | None = Field(default=None, min_length=1)
    user_id: int | None = None
    # Missing: every matching pan.
    limit: int | None = Field(default=None, ge=1)
    offset: int = Field(default=0, ge=0)


class UpdatePanBody(RequestDto):
    # Omitted fields are left unchanged; null is not a value either field takes.
    name: str = Field(default=None, min_length=1)
    snacked: bool = Field(default=None)

    @model_validator(mode="after")
    def _changes_something(self) -> "UpdatePanBody":
        if not self.model_fields_set:
            raise ValueError("Give at least one field to change")
        return self
