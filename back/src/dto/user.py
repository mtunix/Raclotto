from typing import Any, Dict, Literal, get_args

from pydantic import Field, model_validator

from back.src.dto.achievement import AchievementDto
from back.src.dto.base import RequestDto, ResponseDto
from back.src.dto.level import LevelDto
from back.src.entity.level import Level
from back.src.entity.user import User
from back.src.interactor.level_service import LevelProgress

BorderStyle = Literal["solid", "dashed", "dotted", "double"]
BorderTexture = Literal["cheese", "bread", "sauce-01", "sauce-02", "herbs-01", "herbs-02"]
# The languages the frontend ships translations for.
Language = Literal["de", "en"]

BORDER_STYLES: tuple[str, ...] = get_args(BorderStyle)
BORDER_TEXTURES: tuple[str, ...] = get_args(BorderTexture)
LANGUAGES: tuple[str, ...] = get_args(Language)

DEFAULT_COLOR = "#1890ff"
DEFAULT_BORDER_STYLE: BorderStyle = "solid"
DEFAULT_LANGUAGE: Language = "de"


class _UserCard(ResponseDto):
    """Name, avatar and card decoration: what anyone may see of a user."""

    id: int
    name: str
    color: str
    profile_picture: str | None
    border_style: BorderStyle
    border_texture: BorderTexture | None
    glow_effect: bool


def _card(user: User) -> Dict[str, Any]:
    # Rows store styles that are no longer offered (the removed 3D borders); they fall back
    # to the defaults instead of failing the response.
    return dict(
        id=user.id,
        name=user.name,
        color=user.color or DEFAULT_COLOR,
        profile_picture=user.get_profile_picture(),
        border_style=user.border_style if user.border_style in BORDER_STYLES else DEFAULT_BORDER_STYLE,
        border_texture=user.border_texture if user.border_texture in BORDER_TEXTURES else None,
        glow_effect=bool(user.glow_effect),
    )


def _level(level: Level | None) -> LevelDto | None:
    return LevelDto.model_validate(level) if level is not None else None


def _progress(user: User, progress: LevelProgress) -> Dict[str, Any]:
    return dict(
        experience_points=user.experience_points,
        level=_level(progress.level),
        next_level=_level(progress.next_level),
    )


class UserSummaryDto(_UserCard):
    """A user as shown next to their content: name, avatar and card decoration."""

    @classmethod
    def of(cls, user: User) -> "UserSummaryDto":
        return cls(**_card(user))


class UserProfileDto(_UserCard):
    """Any user's profile page; their email, diet and language stay private."""

    experience_points: int
    # Null only while no levels exist.
    level: LevelDto | None
    # Null at the highest level.
    next_level: LevelDto | None
    achievements: list[AchievementDto]

    @classmethod
    def of(cls, user: User, progress: LevelProgress) -> "UserProfileDto":
        return cls(
            **_card(user),
            **_progress(user, progress),
            achievements=[AchievementDto.model_validate(a) for a in user.achievements],
        )


class MeDto(_UserCard):
    """The signed-in user, including what only they see."""

    # Null for accounts created without one (the seeded admin has one).
    email: str | None
    meat: bool
    vegetarian: bool
    vegan: bool
    fish: bool
    histamine: bool
    fructose: bool
    lactose: bool
    gluten: bool
    language: Language
    experience_points: int
    # Null only while no levels exist.
    level: LevelDto | None
    # Null at the highest level.
    next_level: LevelDto | None

    @classmethod
    def of(cls, user: User, progress: LevelProgress) -> "MeDto":
        return cls(
            **_card(user),
            **_progress(user, progress),
            email=user.email,
            meat=user.meat,
            vegetarian=user.vegetarian,
            vegan=user.vegan,
            fish=user.fish,
            histamine=user.histamine,
            fructose=user.fructose,
            lactose=user.lactose,
            gluten=user.gluten,
            language=user.language if user.language in LANGUAGES else DEFAULT_LANGUAGE,
        )


class UpdateMeBody(RequestDto):
    """Omitted fields are left unchanged; null is only a value where the type says so."""

    name: str = Field(default=None, min_length=1)
    meat: bool = Field(default=None)
    vegetarian: bool = Field(default=None)
    vegan: bool = Field(default=None)
    fish: bool = Field(default=None)
    histamine: bool = Field(default=None)
    fructose: bool = Field(default=None)
    lactose: bool = Field(default=None)
    gluten: bool = Field(default=None)
    # Null shows the default color.
    color: str | None = None
    language: Language = Field(default=None)
    # Null removes the picture.
    profile_picture: str | None = None
    border_style: BorderStyle = Field(default=None)
    border_texture: BorderTexture | None = None
    glow_effect: bool = Field(default=None)

    @model_validator(mode="after")
    def _changes_something(self) -> "UpdateMeBody":
        if not self.model_fields_set:
            raise ValueError("Give at least one field to change")
        return self
