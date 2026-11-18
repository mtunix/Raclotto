from __future__ import annotations

import logging
import uuid
from enum import Enum, auto
from functools import wraps
from typing import Any, List, Dict, Callable, TYPE_CHECKING
from flask import Blueprint, typing as ft, request, jsonify
from flask.views import View
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import scoped_session

from ..utils import str_code_from_enum, un_camel_case
from ..driver.database import db
from .constants import JSONAPI_VERSION

if TYPE_CHECKING:
    from ..driver.database import BaseModel


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
    def __init__(self, code: Enum, id_=uuid.uuid4(),
                 status=400, title=None, detail=None, source=None):
        super(ApiError, self).__init__()
        self.code = str_code_from_enum(code)
        self.id_ = id_
        self.status = status
        self.title = title
        self.detail = detail
        self.source = source

    def to_dict(self):
        return {key: getattr(self, key) for key in ERROR_FIELDS}


def requires_json_api_accept(func):
    """Decorator to require JSON API Accept header."""
    @wraps(func)
    def wrapper(*args, **kwargs):
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
        assert request.endpoint is not None
        endpoint = request.endpoint.split(".")[-1]
        blueprint_name = request.endpoint.split(".")[-2]
        return self.endpoints[f"{blueprint_name}.{endpoint}"]
    
    @classmethod
    def get_api_endpoints(cls):
        """Yields all methods of cls which have the route_marker attribute."""
        for func in dir(cls):
            f = getattr(cls, func)
            if callable(f) and hasattr(f, cls.route_marker):
                yield f
    
    @classmethod
    def endpoint(cls, route: str, methods: List[str]):
        """Decorator to mark method as endpoint.
        
        :param route: Route path
        :param methods: List of HTTP methods (e.g., ["GET", "POST"])
        """
        def wrapper(func):
            setattr(func, cls.route_marker, route)
            setattr(func, cls.method_marker, methods)
            
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
