from datetime import datetime

from pydantic import Field

from back.src.dto.base import RequestDto, ResponseDto
from back.src.dto.level import LevelDto


class ProfilePictureDto(ResponseDto):
    """An entry of a user's picture history; the newest is the picture they show."""

    id: int
    # A data URL or a path; null where the user removed their picture.
    profile_picture: str | None
    # The user's level when the picture was saved, or the level it was generated for.
    level_id: int | None
    level: LevelDto | None
    created_at: datetime
    # The picture the next generation starts from; at most one per user.
    is_candidate: bool


class GeneratedPictureDto(ResponseDto):
    """A generated picture, saved as the user's newest profile picture."""

    # Its picture history entry.
    id: int
    image_base64: str
    mime_type: str
    level_id: int | None
    created_at: datetime


class ImageGenerationDto(ResponseDto):
    """Whether the server can generate pictures; without an image model it answers generation with a 503."""

    available: bool


class GenerateImageBody(RequestDto):
    prompt: str = Field(min_length=1)


class GenerateProfilePictureBody(RequestDto):
    # The level to show in the picture; missing or null: the user's current level.
    level_id: int | None = None
