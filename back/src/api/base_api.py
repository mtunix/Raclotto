from __future__ import annotations

import logging
import types
import uuid
from dataclasses import dataclass, field
from enum import Enum, auto
from functools import wraps
from http import HTTPStatus
from typing import (
    Any, Callable, Dict, Iterator, List, Optional, ParamSpec, Sequence, Tuple, TypeVar, Union, get_args, get_origin,
)
from flask import Blueprint, Response, current_app, typing as ft, request, jsonify
from flask.views import View
from pydantic import BaseModel, TypeAdapter, ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import scoped_session
from werkzeug.datastructures import MultiDict

from ..utils import str_code_from_enum, un_camel_case
from ..driver.database import db


class ApiErrorCode(Enum):
    missing_required_body_field = auto()
    endpoint_not_found = auto()
    resource_not_found = auto()
    unknown_url_arg = auto()
    incorrect_header = auto()
    incorrect_parameters = auto()
    incorrect_type = auto()
    undo_forbidden = auto()
    invalid_token = auto()
    internal_error = auto()


ERROR_FIELDS = ('id_', 'status', 'code', 'title', 'detail', 'source')


class ApiError(Exception):
    def __init__(self, code: Enum, id_: Optional[uuid.UUID] = None,
                 status: int = 400, title: Optional[str] = None, detail: Optional[str] = None,
                 source: Optional[Dict[str, str]] = None):
        super(ApiError, self).__init__()
        self.code = str_code_from_enum(code)
        self.id_ = id_ if id_ is not None else uuid.uuid4()
        self.status = status
        self.title = title
        self.detail = detail
        self.source = source

    def to_dict(self) -> Dict[str, Any]:
        return {key: getattr(self, key) for key in ERROR_FIELDS}

    def to_dicts(self) -> List[Dict[str, Any]]:
        """The entries of the response's `errors` list."""
        return [self.to_dict()]


class ApiValidationError(ApiError):
    """A 400 carrying one error per invalid request field."""

    def __init__(self, errors: List[ApiError]):
        super().__init__(ApiErrorCode.incorrect_parameters, status=400, title="Invalid request")
        self.errors = errors

    def to_dicts(self) -> List[Dict[str, Any]]:
        return [error.to_dict() for error in self.errors]


def serialize_error(error: ApiError) -> Dict[str, List[Dict[str, Any]]]:
    return {"errors": error.to_dicts()}


JSON_MIMETYPE = "application/json"

# An auth decorator sets this on its wrapper to the check it runs, so endpoints can run the
# check on its own and the OpenAPI export can see the endpoint needs a token.
AUTH_GUARD = "auth_guard"
TYPED_MARKER = "_typed_endpoint"

P = ParamSpec("P")
R = TypeVar("R")
Handler = TypeVar("Handler", bound=Callable[..., Any])


@dataclass(frozen=True)
class TypedEndpoint:
    """What an endpoint declares: request DTOs, the response DTO, its status and its error statuses."""

    query: Optional[type[BaseModel]]
    body: Optional[type[BaseModel]]
    response: Any
    status: int
    operation_id: Optional[str]
    # The error statuses the handler itself raises; 400 for invalid DTOs and 401 for a missing
    # token are implied by `query`/`body` and the auth guard.
    errors: Tuple[int, ...] = ()
    adapter: Optional[TypeAdapter[Any]] = field(default=None, compare=False, repr=False)

    @classmethod
    def declare(cls, methods: List[str], query: Optional[type[BaseModel]], body: Optional[type[BaseModel]],
                response: Any, status: int, operation_id: Optional[str],
                errors: Sequence[int] = ()) -> TypedEndpoint:
        if len(methods) != 1:
            raise ValueError(f"an endpoint serves exactly one method, got {methods}")
        if (response is None) != (status == 204):
            raise ValueError("an endpoint declares either response= or status=204")
        if body is not None and methods[0].upper() == "GET":
            raise ValueError("a GET endpoint takes no body")
        for dto in (query, body):
            if dto is not None and not _is_model(dto):
                raise TypeError(f"query= and body= take a DTO class, got {dto!r}")
        if response is not None:
            item = get_args(response)[0] if get_origin(response) is list else response
            if not _is_model(item):
                raise TypeError(f"response= takes a DTO class or list[DTO], got {response!r}")
        for error in errors:
            if not (isinstance(error, int) and error in _ERROR_STATUSES):
                raise ValueError(f"errors= takes HTTP error statuses (4xx, 5xx), got {error!r}")
        if len(set(errors)) != len(errors):
            raise ValueError(f"errors= lists a status twice: {list(errors)}")
        adapter = TypeAdapter(response) if response is not None else None
        return cls(query, body, response, status, operation_id, tuple(sorted(errors)), adapter)

    @property
    def response_model(self) -> Optional[type[BaseModel]]:
        """The DTO class behind `response`, unwrapping `list[...]`."""
        model: Optional[type[BaseModel]] = (
            get_args(self.response)[0] if get_origin(self.response) is list else self.response
        )
        return model

    def check_media_types(self) -> None:
        """Raises ApiError 415 for a body that isn't JSON and 406 when JSON isn't acceptable."""
        if self.body is not None and request.mimetype != JSON_MIMETYPE:
            raise ApiError(
                ApiErrorCode.incorrect_header,
                status=415,
                title="Unsupported Media Type",
                detail="Content-Type must be application/json"
            )
        # A missing Accept header accepts anything.
        if request.headers.get('Accept') and request.accept_mimetypes.best_match([JSON_MIMETYPE]) is None:
            raise ApiError(
                ApiErrorCode.incorrect_header,
                status=406,
                title="Not Acceptable",
                detail="Accept header must allow application/json"
            )

    def parse_request(self) -> Dict[str, BaseModel]:
        """The `query=` / `body=` kwargs for the handler; raises ApiValidationError."""
        parsed: Dict[str, BaseModel] = {}
        issues: List[ApiError] = []
        if self.query is not None:
            try:
                parsed["query"] = self.query.model_validate(_query_input(self.query, request.args))
            except ValidationError as e:
                issues += _validation_issues(e, "query", "Invalid query parameter")
        if self.body is not None:
            try:
                parsed["body"] = self.body.model_validate_json(request.get_data())
            except ValidationError as e:
                issues += _validation_issues(e, "body", "Invalid request body")
        if issues:
            raise ApiValidationError(issues)
        return parsed

    def render(self, result: Any, handler: Callable[..., Any]) -> Response:
        if self.status == 204:
            if result is not None:
                raise TypeError(f"{handler.__qualname__} declares status=204 but returned {type(result).__name__}")
            response = current_app.response_class(status=204)
            del response.headers["Content-Type"]
            return response
        if not _matches(result, self.response):
            raise TypeError(
                f"{handler.__qualname__} declares response={_type_name(self.response)} "
                f"but returned {type(result).__name__}"
            )
        assert self.adapter is not None  # declare() builds one for every response=
        payload = self.adapter.dump_python(result, mode="json", by_alias=True)
        response = jsonify(payload)
        response.status_code = self.status
        return response


_ERROR_STATUSES = {status.value for status in HTTPStatus if status.value >= 400}


def typed_endpoint(func: Callable[..., Any]) -> TypedEndpoint:
    typed: TypedEndpoint = getattr(func, TYPED_MARKER)
    return typed


def _is_model(value: Any) -> bool:
    return isinstance(value, type) and issubclass(value, BaseModel)


def _matches(value: Any, declared: Any) -> bool:
    if get_origin(declared) is list:
        item = get_args(declared)[0]
        return isinstance(value, list) and all(isinstance(v, item) for v in value)
    return isinstance(value, declared)


def _type_name(declared: Any) -> str:
    if get_origin(declared) is list:
        return f"list[{get_args(declared)[0].__name__}]"
    name: str = declared.__name__
    return name


def _accepts_many(annotation: Any) -> bool:
    origin = get_origin(annotation)
    if origin in (list, set, frozenset, tuple):
        return True
    if origin in (Union, types.UnionType):
        return any(_accepts_many(arg) for arg in get_args(annotation))
    return False


def _query_input(model: type[BaseModel], args: MultiDict[str, str]) -> Dict[str, Any]:
    """Query args as a dict, keeping repeated values only for fields that take a collection."""
    fields = {field.alias or name: field for name, field in model.model_fields.items()}
    result: Dict[str, Any] = {}
    for key in args.keys():
        field = fields.get(key)
        values = args.getlist(key)
        result[key] = values if field is not None and _accepts_many(field.annotation) else values[0]
    return result


def _json_pointer(location: str, loc: Tuple[int | str, ...]) -> str:
    parts = [location] + [str(part).replace("~", "~0").replace("/", "~1") for part in loc]
    return "/" + "/".join(parts)


def _validation_issues(error: ValidationError, location: str, title: str) -> List[ApiError]:
    return [
        ApiError(
            ApiErrorCode.incorrect_parameters,
            status=400,
            title=title,
            detail=issue["msg"],
            source={"pointer": _json_pointer(location, issue["loc"])},
        )
        for issue in error.errors(include_url=False)
    ]


def _routed_endpoint() -> Callable[..., Any]:
    """The registered endpoint function the current request was routed to."""
    assert request.endpoint is not None
    blueprint_name, endpoint = request.endpoint.split(".")[-2:]
    return BaseApi.endpoints[f"{blueprint_name}.{endpoint}"]


def catch_integrity_errors(session: scoped_session[Any]) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Answer 409 when a write breaks a database constraint (a taken name, a duplicate)."""
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            try:
                return func(*args, **kwargs)
            except IntegrityError as e:
                session.rollback()
                error = ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=409,
                    title="Conflict",
                    detail="The change conflicts with existing data",
                )
                # The database's message names tables and values; only the log gets it.
                logging.warning("Integrity error %s: %s", error.id_, e)
                raise error from e
        return wrapper
    return decorator


def catch_processing_exceptions(func: Callable[P, R]) -> Callable[P, R]:
    """Decorator to catch processing exceptions."""
    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        try:
            return func(*args, **kwargs)
        except ApiError:
            raise
        except Exception as e:
            # The exception may carry SQL, file paths or secrets; the client gets the id to quote.
            error = ApiError(
                ApiErrorCode.internal_error,
                status=500,
                title="Internal Server Error",
                detail="An unexpected error occurred",
            )
            logging.error("Unexpected error %s: %s", error.id_, e, exc_info=True)
            raise error from e
    return wrapper


class BaseApi(View):
    """Routes requests to the endpoints its subclasses declare with `BaseApi.endpoint`."""

    init_every_request = False

    method_marker = "_method"
    route_marker = "_route"
    endpoints: Dict[str, Callable[..., Any]] = {}

    url_prefix = ""
    blueprint_name = ""

    logger = logging.getLogger("api.api_rules")
    session: scoped_session[Any] = db.session

    def dispatch_request(self, **kwargs: Any) -> ft.ResponseReturnValue:
        endpoint = self.get_endpoint()
        meth = self.typed_wrapper(endpoint, typed_endpoint(endpoint))
        meth = catch_integrity_errors(self.session)(meth)
        meth = catch_processing_exceptions(meth)

        return meth(self, **kwargs)

    @staticmethod
    def typed_wrapper(func: Callable[..., Any], typed: TypedEndpoint) -> Callable[..., Response]:
        """Validates the request into DTOs, calls the handler and renders its DTO as plain JSON."""
        @wraps(func)
        def new_func(api: BaseApi, **kwargs: Any) -> Response:
            typed.check_media_types()
            try:
                dtos = typed.parse_request()
            except ApiValidationError:
                # A request without valid credentials gets 401, not a report on its body.
                guard = getattr(func, AUTH_GUARD, None)
                if guard is not None:
                    guard()
                raise
            return typed.render(func(api, **kwargs, **dtos), func)

        return new_func

    @classmethod
    def get_blueprint(cls) -> Blueprint:
        """Create and return a Flask Blueprint for this API."""
        blueprint_name = un_camel_case(cls.__name__)
        api = Blueprint(blueprint_name, __name__, url_prefix=cls.url_prefix)
        view = cls.as_view(blueprint_name)
        
        for e in cls.get_api_endpoints():
            route = getattr(e, cls.route_marker)
            methods = getattr(e, cls.method_marker)
            api.add_url_rule(
                route, endpoint=e.__name__, view_func=view, methods=methods
            )
            cls.endpoints[f"{blueprint_name}.{e.__name__}"] = e
        
        return api
    
    def get_endpoint(self) -> Callable[..., Any]:
        """Get the endpoint function from request."""
        return _routed_endpoint()
    
    @classmethod
    def get_api_endpoints(cls) -> Iterator[Callable[..., Any]]:
        """Yields all methods of cls which have the route_marker attribute."""
        for func in dir(cls):
            f = getattr(cls, func)
            if callable(f) and hasattr(f, cls.route_marker):
                yield f
    
    @classmethod
    def endpoint(cls, route: str, methods: List[str], *, query: Optional[type[BaseModel]] = None,
                 body: Optional[type[BaseModel]] = None, response: Any = None, status: int = 200,
                 operation_id: Optional[str] = None, errors: Sequence[int] = ()) -> Callable[[Handler], Handler]:
        """Decorator to mark a method as endpoint; it must declare `response=` or `status=204`.

        The handler gets `query=`/`body=` as validated DTOs, returns the response DTO and appears
        in the OpenAPI spec. `errors=` lists the error statuses the handler and what it calls can
        answer with.
        """
        typed = TypedEndpoint.declare(methods, query, body, response, status, operation_id, errors)

        def wrapper(func: Handler) -> Handler:
            setattr(func, cls.route_marker, route)
            setattr(func, cls.method_marker, methods)
            setattr(func, TYPED_MARKER, typed)
            return func

        return wrapper


def init_api_rules(apis: Sequence[type[BaseApi]], session: scoped_session[Any]) -> Blueprint:
    """Initialize API rules and register blueprints.
    
    :param apis: List of API classes
    :param session: Database session
    :return: Blueprint with all APIs registered
    """
    BaseApi.session = session
    
    api_rules = Blueprint("api_rules", __name__, url_prefix="/api")
    for api in apis:
        api_rules.register_blueprint(api.get_blueprint())
    
    return api_rules
