from typing import Annotated

from pydantic import Field

from back.src.dto.base import RequestDto, ResponseDto

# What the UI's Rate controls send: 0 (cleared) to 5 stars in half steps. The column is an
# Integer, but SQLite stores half stars as they are, so ratings come back as floats.
Stars = Annotated[float, Field(ge=0, le=5, multiple_of=0.5)]


class RatingDto(ResponseDto):
    id: int
    rating: float
    user_id: int
    pan_id: int
    session_id: int


class ListRatingsQuery(RequestDto):
    session_key: str | None = Field(default=None, min_length=1)


class CreateRatingBody(RequestDto):
    """Rate a pan as the signed-in user; rating the same pan again changes the rating."""

    pan_id: int
    rating: Stars


class UpdateRatingBody(RequestDto):
    rating: Stars
