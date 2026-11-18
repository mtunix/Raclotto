"""Base classes for the request and response DTOs, and the error body every endpoint shares."""

from pydantic import BaseModel, ConfigDict


class ResponseDto(BaseModel):
    """Shape of a response; build it from an entity with `model_validate(entity)`."""

    # Defaulted fields are always present on the wire, so the client types make them required.
    model_config = ConfigDict(from_attributes=True, json_schema_serialization_defaults_required=True)


class RequestDto(BaseModel):
    """Shape of a request body or query string; unknown fields are rejected."""

    model_config = ConfigDict(extra="forbid")


class ApiErrorSourceDto(ResponseDto):
    pointer: str


class ApiErrorDto(ResponseDto):
    id_: str
    status: int
    code: str
    title: str | None
    detail: str | None
    source: ApiErrorSourceDto | None


class ErrorResponseDto(ResponseDto):
    errors: list[ApiErrorDto]
