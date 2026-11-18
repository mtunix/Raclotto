from datetime import datetime

from pydantic import Field

from back.src.dto.base import RequestDto, ResponseDto


class SessionDto(ResponseDto):
    id: int
    key: str
    name: str
    timestamp: datetime
    # Closed sessions are inactive until someone reactivates them.
    active: bool
    # Null for sessions created without a signed-in creator.
    created_by_user_id: int | None


class SessionKeyQuery(RequestDto):
    session_key: str = Field(min_length=1)


class SessionFilterQuery(RequestDto):
    # Missing: every session.
    session_key: str | None = Field(default=None, min_length=1)


class ListSessionsQuery(RequestDto):
    include_inactive: bool = False


class CreateSessionBody(RequestDto):
    name: str = Field(min_length=1)


class UpdateSessionBody(RequestDto):
    name: str = Field(min_length=1)


class SessionKeyBody(RequestDto):
    key: str = Field(min_length=1)
