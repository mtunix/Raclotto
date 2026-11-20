from datetime import datetime

from back.src.dto.base import ResponseDto


class InviteDto(ResponseDto):
    """An invite as its creator sees it; the token is what the registration link carries."""

    id: int
    token: str
    created_at: datetime
    expires_at: datetime
    is_used: bool
    used_at: datetime | None


class InviteLookupDto(ResponseDto):
    """What the registration page shows for a valid invite link."""

    expires_at: datetime
