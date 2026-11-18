from typing import Literal, get_args

from back.src.dto.base import ResponseDto
from back.src.entity.user import User

BorderStyle = Literal["solid", "dashed", "dotted", "double"]
BorderTexture = Literal["cheese", "bread", "sauce-01", "sauce-02", "herbs-01", "herbs-02"]

BORDER_STYLES: tuple[str, ...] = get_args(BorderStyle)
BORDER_TEXTURES: tuple[str, ...] = get_args(BorderTexture)

DEFAULT_COLOR = "#1890ff"
DEFAULT_BORDER_STYLE: BorderStyle = "solid"


class UserSummaryDto(ResponseDto):
    """A user as shown next to their content: name, avatar and card decoration.

    Rows store styles that are no longer offered (the removed 3D borders); they fall back
    to the defaults instead of failing the response.
    """

    id: int
    name: str
    color: str
    profile_picture: str | None
    border_style: BorderStyle
    border_texture: BorderTexture | None
    glow_effect: bool

    @classmethod
    def of(cls, user: User) -> "UserSummaryDto":
        return cls(
            id=user.id,
            name=user.name,
            color=user.color or DEFAULT_COLOR,
            profile_picture=user.get_profile_picture(),
            border_style=user.border_style if user.border_style in BORDER_STYLES else DEFAULT_BORDER_STYLE,
            border_texture=user.border_texture if user.border_texture in BORDER_TEXTURES else None,
            glow_effect=bool(user.glow_effect),
        )
