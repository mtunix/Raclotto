from pydantic import Field

from back.src.dto.base import RequestDto, ResponseDto


class InsultDto(ResponseDto):
    id: int
    # Null for insults created without one before the body was checked.
    title: str | None


class InsultBody(RequestDto):
    title: str = Field(min_length=1)
