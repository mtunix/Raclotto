from pydantic import Field

from back.src.dto.base import RequestDto, ResponseDto


class PrepTypeDto(ResponseDto):
    id: int
    name: str
    # Null for the default types every session offers.
    session_id: int | None


class CreatePrepTypeBody(RequestDto):
    name: str = Field(min_length=1)
