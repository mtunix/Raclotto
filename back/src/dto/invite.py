from datetime import datetime

from pydantic import Field

from back.src.dto.base import RequestDto, ResponseDto


class InviteDto(ResponseDto):
    """An invite as its creator sees it; the token is what the registration link carries."""

    id: int
    token: str
    email: str
    expires_at: datetime
    is_used: bool
    used_at: datetime | None


class InviteLookupDto(ResponseDto):
    """What the registration page shows for a valid invite link."""

    email: str
    expires_at: datetime


class CreateInviteBody(RequestDto):
    email: str = Field(min_length=1)
