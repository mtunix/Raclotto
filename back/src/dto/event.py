from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from back.src.dto.base import RequestDto, ResponseDto

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


class EventConfigDto(ResponseDto):
    id: int
    event_type: EventType
    # Null for the global config every session without its own falls back to.
    session_id: int | None
    enabled: bool
    # Stored and returned, but no event evaluator reads it yet.
    frequency_minutes: int | None


class SaveEventConfigBody(RequestDto):
    """Set whether an event type is enabled, for one session or globally."""

    event_type: EventType
    enabled: bool
    # Null or missing keeps the stored frequency.
    frequency_minutes: int | None = None
    # Missing: the global config.
    session_key: str | None = Field(default=None, min_length=1)


class UpdateEventConfigBody(RequestDto):
    # Omitted fields are left unchanged; null is a value only for the frequency.
    enabled: bool = Field(default=None)
    frequency_minutes: int | None = None

    @model_validator(mode="after")
    def _changes_something(self) -> "UpdateEventConfigBody":
        if not self.model_fields_set:
            raise ValueError("Give at least one field to change")
        return self
