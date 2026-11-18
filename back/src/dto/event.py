from datetime import datetime
from typing import Literal

from back.src.dto.base import ResponseDto

EventType = Literal["pan_swap"]


class PanSwapDataDto(ResponseDto):
    pan1_id: int
    pan1_user_id: int
    pan1_user_name: str
    pan2_id: int
    pan2_user_id: int
    pan2_user_name: str
    time_window_minutes: int


class EventDto(ResponseDto):
    id: int
    session_id: int
    event_type: EventType
    message: str
    data: PanSwapDataDto
    created_at: datetime
