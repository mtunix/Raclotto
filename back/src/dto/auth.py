from pydantic import Field

from back.src.dto.base import RequestDto, ResponseDto
from back.src.dto.user import MeDto

MIN_PASSWORD_LENGTH = 8


class LoginBody(RequestDto):
    name_or_email: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RegisterBody(RequestDto):
    """Sign up with an unused invite; the email must be the one the invite was made for."""

    token: str = Field(min_length=1)
    email: str = Field(min_length=1)
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
