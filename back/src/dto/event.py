from datetime import datetime
from typing import Any, Literal

from pydantic import Field, model_validator

from back.src.dto.base import RequestDto, ResponseDto, omittable

# The types the backend evaluates; only these can be configured. Responses carry any stored
# type, since the old API saved configs for any.
EventType = Literal["pan_swap"]


class EventDto(ResponseDto):
    id: int
    session_id: int
    event_type: str
    message: str
    # Whatever the event's evaluator stored. pan_swap: pan1_id, pan1_user_id, pan1_user_name,
    # pan2_id, pan2_user_id, pan2_user_name, time_window_minutes.
    data: dict[str, Any] | None
    created_at: datetime


class EventConfigDto(ResponseDto):
    id: int
    event_type: str
    # Null for the global config every session without its own falls back to.
    session_id: int | None
    enabled: bool
    # Minimum minutes between two events of this type in a session; null: the event's own cooldown.
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
    enabled: bool = omittable()
    frequency_minutes: int | None = None

    @model_validator(mode="after")
    def _changes_something(self) -> UpdateEventConfigBody:
        if not self.model_fields_set:
            raise ValueError("Give at least one field to change")
        return self
