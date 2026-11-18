from typing import Literal

from back.src.dto.base import ResponseDto


class HealthDto(ResponseDto):
    status: Literal["ok"]
    version: str
