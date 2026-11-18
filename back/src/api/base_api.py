from __future__ import annotations

import logging
import types
import uuid
from dataclasses import dataclass, field
from enum import Enum, auto
from functools import wraps
from typing import Any, List, Dict, Callable, Optional, Union, get_args, get_origin
from flask import Blueprint, Response, current_app, typing as ft, request, jsonify
from flask.views import View
from pydantic import BaseModel, TypeAdapter, ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import scoped_session
from werkzeug.datastructures import MultiDict

from ..utils import str_code_from_enum, un_camel_case
from ..driver.database import db
from .constants import JSONAPI_VERSION


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


ERROR_FIELDS = ('id_', 'status', 'code', 'title', 'detail', 'source')


class ApiError(Exception):
    def __init__(self, code: Enum, id_=None,
                 status=400, title=None, detail=None, source=None):
        super(ApiError, self).__init__()
        self.code = str_code_from_enum(code)
        self.id_ = id_ if id_ is not None else uuid.uuid4()
        self.status = status
        self.title = title
        self.detail = detail
        self.source = source

    def to_dict(self):
        return {key: getattr(self, key) for key in ERROR_FIELDS}

    def to_dicts(self) -> List[dict]:
        """The entries of the response's `errors` list."""
        return [self.to_dict()]


class ApiValidationError(ApiError):
    """A 400 carrying one error per invalid request field."""

    def __init__(self, errors: List[ApiError]):
        super().__init__(ApiErrorCode.incorrect_parameters, status=400, title="Invalid request")
        self.errors = errors

    def to_dicts(self) -> List[dict]:
        return [error.to_dict() for error in self.errors]


JSON_MIMETYPES = ("application/json", "application/vnd.api+json")

# An auth decorator sets this on its wrapper to the check it runs, so typed endpoints can
# run the check on its own and the OpenAPI export can see the endpoint needs a token.
AUTH_GUARD = "auth_guard"
TYPED_MARKER = "_typed_endpoint"


@dataclass(frozen=True)
class TypedEndpoint:
    """What a typed endpoint declares: request DTOs, the response DTO and its status."""

    query: Optional[type[BaseModel]]
    body: Optional[type[BaseModel]]
    response: Any
    status: int
    operation_id: Optional[str]
    adapter: Optional[TypeAdapter] = field(default=None, compare=False, repr=False)

    @classmethod
    def declare(cls, methods: List[str], query: Optional[type[BaseModel]], body: Optional[type[BaseModel]],
                response: Any, status: int, operation_id: Optional[str]) -> TypedEndpoint:
        if len(methods) != 1:
            raise ValueError(f"a typed endpoint serves exactly one method, got {methods}")
        if (response is None) != (status == 204):
            raise ValueError("a typed endpoint declares response= or status=204, not both")
        if body is not None and methods[0].upper() == "GET":
            raise ValueError("a GET endpoint takes no body")
        for dto in (query, body):
            if dto is not None and not _is_model(dto):
                raise TypeError(f"query= and body= take a DTO class, got {dto!r}")
        if response is not None:
            item = get_args(response)[0] if get_origin(response) is list else response
            if not _is_model(item):
                raise TypeError(f"response= takes a DTO class or list[DTO], got {response!r}")
        adapter = TypeAdapter(response) if response is not None else None
        return cls(query, body, response, status, operation_id, adapter)

    @property
    def response_model(self) -> Optional[type[BaseModel]]:
        """The DTO class behind `response`, unwrapping `list[...]`."""
        if get_origin(self.response) is list:
            return get_args(self.response)[0]
        return self.response

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

    def render(self, result: Any, handler: Callable) -> Response:
        if self.status == 204:
            if result is not None:
                raise TypeError(f"{handler.__qualname__} declares status=204 but returned {type(result).__name__}")
            return current_app.response_class(status=204)
        if not _matches(result, self.response):
            raise TypeError(
                f"{handler.__qualname__} declares response={_type_name(self.response)} "
                f"but returned {type(result).__name__}"
            )
        payload = self.adapter.dump_python(result, mode="json", by_alias=True)
        response = jsonify(payload)
        response.status_code = self.status
        return response


def typed_endpoint(func: Callable) -> Optional[TypedEndpoint]:
    return getattr(func, TYPED_MARKER, None)


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
    return declared.__name__


def _accepts_many(annotation: Any) -> bool:
    origin = get_origin(annotation)
    if origin in (list, set, frozenset, tuple):
        return True
    if origin in (Union, types.UnionType):
        return any(_accepts_many(arg) for arg in get_args(annotation))
    return False


def _query_input(model: type[BaseModel], args: MultiDict) -> Dict[str, Any]:
    """Query args as a dict, keeping repeated values only for fields that take a collection."""
    fields = {field.alias or name: field for name, field in model.model_fields.items()}
    result: Dict[str, Any] = {}
    for key in args.keys():
        field = fields.get(key)
        values = args.getlist(key)
        result[key] = values if field is not None and _accepts_many(field.annotation) else values[0]
    return result


def _json_pointer(location: str, loc: tuple) -> str:
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


def _routed_endpoint() -> Callable:
    """The registered endpoint function the current request was routed to."""
    assert request.endpoint is not None
    blueprint_name, endpoint = request.endpoint.split(".")[-2:]
    return BaseApi.endpoints[f"{blueprint_name}.{endpoint}"]


def requires_json_api_accept(func):
    """Decorator to require JSON API Accept header."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if typed_endpoint(_routed_endpoint()) is not None:
            # A missing Accept header accepts anything.
            if request.headers.get('Accept') and request.accept_mimetypes.best_match(JSON_MIMETYPES) is None:
                raise ApiError(
                    ApiErrorCode.incorrect_header,
                    status=406,
                    title="Not Acceptable",
                    detail="Accept header must allow application/json"
                )
            return func(*args, **kwargs)
        accept = request.headers.get('Accept', '')
        if 'application/vnd.api+json' not in accept and '*/*' not in accept:
            raise ApiError(
                ApiErrorCode.incorrect_header,
                status=406,
                title="Not Acceptable",
                detail="Accept header must include application/vnd.api+json"
            )
        return func(*args, **kwargs)
    return wrapper


def requires_json_api_mimetype(func):
    """Decorator to require JSON API Content-Type for POST/PATCH requests."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        typed = typed_endpoint(_routed_endpoint())
        if typed is not None:
            if typed.body is not None and request.mimetype not in JSON_MIMETYPES:
                raise ApiError(
                    ApiErrorCode.incorrect_header,
                    status=415,
                    title="Unsupported Media Type",
                    detail="Content-Type must be application/json"
                )
            return func(*args, **kwargs)
        if request.method in ['POST', 'PATCH', 'PUT']:
            content_type = request.headers.get('Content-Type', '')
            if 'application/vnd.api+json' not in content_type:
                raise ApiError(
                    ApiErrorCode.incorrect_header,
                    status=415,
                    title="Unsupported Media Type",
                    detail="Content-Type must be application/vnd.api+json"
                )
        return func(*args, **kwargs)
    return wrapper


def mime_renderer(func):
    """Decorator to render response as JSON API."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        
        # If result is already a Response, return it
        from flask import Response
        if isinstance(result, Response):
            return result
        
        # If result is a tuple (data, status) or (data, status, headers)
        if isinstance(result, tuple):
            data, status = result[0], result[1] if len(result) > 1 else 200
            headers = result[2] if len(result) > 2 else {}
            
            # If data is already a dict with jsonapi, return as JSON
            if isinstance(data, dict) and 'jsonapi' in data:
                return jsonify(data), status, headers
            
            # Otherwise wrap in JSON API format
            return jsonify({
                'jsonapi': {'version': JSONAPI_VERSION},
                'data': data
            }), status, headers
        
        # If result is a dict with jsonapi, return as JSON
        if isinstance(result, dict) and 'jsonapi' in result:
            return jsonify(result), 200
        
        # Otherwise wrap in JSON API format
        return jsonify({
            'jsonapi': {'version': JSONAPI_VERSION},
            'data': result
        }), 200
    
    return wrapper


def catch_integrity_errors(session: scoped_session):
    """Decorator to catch database integrity errors."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except IntegrityError as e:
                session.rollback()
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=409,
                    title="Conflict",
                    detail=f"Database integrity error: {str(e)}"
                )
        return wrapper
    return decorator


def catch_processing_exceptions(func):
    """Decorator to catch processing exceptions."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ApiError:
            raise
        except Exception as e:
            logging.error(f"Processing error: {e}", exc_info=True)
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Internal Server Error",
                detail=str(e)
            )
    return wrapper


class BaseApi(View):
    """Base API class without Flask-Restless dependencies."""
    
    init_every_request = False
    
    decorators = [
        requires_json_api_accept,
        requires_json_api_mimetype,
        mime_renderer
    ]
    
    method_marker = "_method"
    route_marker = "_route"
    endpoints: Dict[str, Callable[..., Any]] = {}
    
    url_prefix = ""
    blueprint_name = ""
    
    logger = logging.getLogger("api.api_rules")
    session: scoped_session = db.session
    
    success = {"success": True}
    
    def dispatch_request(self, **kwargs: Any) -> ft.ResponseReturnValue:
        endpoint = self.get_endpoint()
        
        typed = typed_endpoint(endpoint)
        if typed is not None:
            meth = self.typed_wrapper(endpoint, typed)
        else:
            meth = self.serialize_wrapper(endpoint)
        meth = catch_integrity_errors(self.session)(meth)
        meth = catch_processing_exceptions(meth)
        
        return meth(self, **kwargs)
    
    def serialize_wrapper(self, func):
        """Wrapper to serialize response to JSON API format."""
        @wraps(func)
        def new_func(*args, **kwargs):
            result = func(*args, **kwargs)
            
            # If result is already a tuple, return as-is
            if isinstance(result, tuple):
                return result
            
            # If result is a dict with 'jsonapi' key, it's already formatted
            if isinstance(result, dict) and 'jsonapi' in result:
                return result
            
            # If result is None, return 204
            if result is None:
                return {}, 204
            
            # Otherwise, return as data
            return result
        
        return new_func
    
    @staticmethod
    def typed_wrapper(func, typed: TypedEndpoint):
        """Validates the request into DTOs, calls the handler and renders its DTO as plain JSON."""
        @wraps(func)
        def new_func(api, **kwargs):
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
    def get_blueprint(cls):
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
    
    def get_endpoint(self):
        """Get the endpoint function from request."""
        return _routed_endpoint()
    
    @classmethod
    def get_api_endpoints(cls):
        """Yields all methods of cls which have the route_marker attribute."""
        for func in dir(cls):
            f = getattr(cls, func)
            if callable(f) and hasattr(f, cls.route_marker):
                yield f
    
    @classmethod
    def endpoint(cls, route: str, methods: List[str], *, query: Optional[type[BaseModel]] = None,
                 body: Optional[type[BaseModel]] = None, response: Any = None, status: int = 200,
                 operation_id: Optional[str] = None):
        """Decorator to mark method as endpoint.
        
        Declaring `response=` (or `status=204`) makes it a typed endpoint: the handler gets
        `query=`/`body=` as validated DTOs, returns the response DTO and appears in the OpenAPI spec.
        """
        typed = None
        if any(arg is not None for arg in (query, body, response, operation_id)) or status != 200:
            typed = TypedEndpoint.declare(methods, query, body, response, status, operation_id)

        def wrapper(func):
            setattr(func, cls.route_marker, route)
            setattr(func, cls.method_marker, methods)
            if typed is not None:
                setattr(func, TYPED_MARKER, typed)
            
            @wraps(func)
            def inner(*args, **kwargs):
                return func(*args, **kwargs)
            
            return inner
        
        return wrapper


def init_api_rules(apis, session):
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
