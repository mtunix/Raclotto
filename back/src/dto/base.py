"""Base classes for the request and response DTOs, and the error body every endpoint shares."""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ResponseDto(BaseModel):
    """Shape of a response; build it from an entity with `model_validate(entity)`."""

    # Defaulted fields are always present on the wire, so the client types make them required.
    model_config = ConfigDict(from_attributes=True, json_schema_serialization_defaults_required=True)


class RequestDto(BaseModel):
    """Shape of a request body or query string; unknown fields are rejected."""

    model_config = ConfigDict(extra="forbid")


def omittable(**constraints: Any) -> Any:
    """Default of a PATCH field that may be left out but never set to null: `Field(default=None, ...)`.

    Typed Any so the field keeps its non-null type; read the field only when it is in `model_fields_set`.
    """
    return Field(default=None, **constraints)


class ApiErrorCode(StrEnum):
    """What went wrong, for clients to tell errors apart; the frontend translates each one."""

    missing_required_body_field = "api_error_code.missing_required_body_field"
    endpoint_not_found = "api_error_code.endpoint_not_found"
    resource_not_found = "api_error_code.resource_not_found"
    unknown_url_arg = "api_error_code.unknown_url_arg"
    incorrect_header = "api_error_code.incorrect_header"
    incorrect_parameters = "api_error_code.incorrect_parameters"
    incorrect_type = "api_error_code.incorrect_type"
    undo_forbidden = "api_error_code.undo_forbidden"
    invalid_token = "api_error_code.invalid_token"
    forbidden = "api_error_code.forbidden"
    conflict = "api_error_code.conflict"
    too_many_requests = "api_error_code.too_many_requests"
    image_generation_unavailable = "api_error_code.image_generation_unavailable"
    image_generation_failed = "api_error_code.image_generation_failed"
    internal_error = "api_error_code.internal_error"


class ApiErrorSourceDto(ResponseDto):
    pointer: str


class ApiErrorDto(ResponseDto):
    id_: str
    status: int
    code: ApiErrorCode
    # English, for logs and API users; the frontend shows its translation of `code` instead.
    title: str | None
    detail: str | None
    source: ApiErrorSourceDto | None


class ErrorResponseDto(ResponseDto):
    errors: list[ApiErrorDto]
