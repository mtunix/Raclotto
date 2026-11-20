from pydantic import Field

from back.src.dto.base import RequestDto, ResponseDto
from back.src.dto.session import SessionDto
from back.src.dto.user import MeDto

MIN_PASSWORD_LENGTH = 8


class LoginBody(RequestDto):
    name_or_email: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RegisterBody(RequestDto):
    """Sign up with an unused invite; the email is optional and only another way to sign in."""

    token: str = Field(min_length=1)
    email: str | None = None
    name: str = Field(min_length=1)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    profile_picture: str | None = None


class ChangePasswordBody(RequestDto):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH)


class AuthResultDto(ResponseDto):
    token: str
    user: MeDto


class TokenDto(ResponseDto):
    token: str


class JoinBody(RequestDto):
    """Join a session as a guest: a name is all it takes."""

    join_code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    profile_picture: str | None = None


class JoinLookupDto(ResponseDto):
    """The session a join link opens."""

    session_id: int
    session_name: str
    # A closed session takes no new guests.
    active: bool


class JoinResultDto(ResponseDto):
    token: str
    user: MeDto
    session: SessionDto


class ClaimAccountBody(RequestDto):
    """Keep a guest account: a password, and optionally an email to sign in with."""

    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    email: str | None = None
