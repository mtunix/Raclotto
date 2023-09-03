from __future__ import annotations

import logging
import uuid
from enum import Enum, auto
from functools import wraps
from typing import Any, List, Dict, Callable, TYPE_CHECKING, Type
from flask import Blueprint, typing as ft, request

from flask.views import View

from flask_restless.views.base import catch_processing_exceptions, \
    requires_json_api_accept, requires_json_api_mimetype, mime_renderer, \
    catch_integrity_errors, JSONAPI_VERSION
from sqlalchemy.orm import scoped_session

from ..utils import str_code_from_enum, un_camel_case, to_camel_case

if TYPE_CHECKING:
    from flask_restless import Deserializer, Serializer
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
        # code Error Code as string
        self.code = str_code_from_enum(code)
        # a unique identifier for this particular occurrence of the problem.
        self.id_ = id_
        # status: http status code
        self.status = status
        # title: a short, human-readable summary of the problem that SHOULD NOT
        # change from occurrence to occurrence of the problem
        self.title = title
        # detail: a human-readable explanation specific to this occurrence of
        # the problem.
        self.detail = detail
        # source: an object containing references to the primary source of the
        # error
        # Include one of the following or omit 'source':
        #   pointer: a JSON Pointer [RFC6901] to the value in the request
        #   document that caused the error.
        #   parameter: a string indicating which URI query parameter caused the
        #   error.
        #   header: a string indicating the name of a single request header
        #   which caused the error.
        self.source = source

    def to_dict(self):
        return {key: getattr(self, key) for key in ERROR_FIELDS}


class RaclottoApi(View):
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
    serializers: Dict[BaseModel, Serializer]  = {}
    deserializers: Dict[str, Deserializer] = {}
    session: scoped_session

    success = {"success": True}

    def dispatch_request(self, **kwargs: Any) -> ft.ResponseReturnValue:
        endpoint = self.get_endpoint()

        meth = self.serialize_wrapper(endpoint)
        meth = catch_integrity_errors(self.session)(meth)

        return meth(self, **kwargs)

    def serialize_wrapper(self, func):
        # todo: - This should be done on a per-endpoint basis, i think.
        #       - Add pagination through the restless Paginated class
        @wraps(func)
        def new_func(*args, **kwargs):
            result = func(*args, **kwargs)
            data = result
            if type(result) in self.serializers:
                data = self.serialize(result)
            elif isinstance(result, list):
                try:
                    data = [*map(self.serialize, result)]
                except KeyError:
                    pass
            elif result is None:
                return {}, 204, {}

            return {
                'jsonapi': {'version': JSONAPI_VERSION},
                'data': data
            }, 200, {}

        return new_func

    @catch_processing_exceptions
    def serialize(self, result):
        return self.serializers[type(result)].serialize(result)

    def deserialize_body(self, type_: Type):
        data: Any = request.json
        obj = self.deserializers[data["data"]["type"]].deserialize(data)
        if not isinstance(obj, type_):
            raise ApiError(
                ApiErrorCode.incorrect_type,
                detail=f"Expected: {to_camel_case(type_.__name__)}, "
                       f"got: {to_camel_case(type(obj).__name__)}"
            )
        return obj

    @classmethod
    def get_blueprint(cls):
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
        assert request.endpoint is not None
        endpoint = request.endpoint.split(".")[-1]
        blueprint_name = request.endpoint.split(".")[-2]
        return self.endpoints[f"{blueprint_name}.{endpoint}"]

    @classmethod
    def get_api_endpoints(cls):
        """Yields all methods of cls which have the attribute
        defined by 'route_marker'
        """
        for func in dir(cls):
            f = getattr(cls, func)
            if callable(f) and hasattr(f, cls.route_marker):
                yield f

    @classmethod
    def endpoint(cls, route: str, methods: List[str]):
        """Decorator to mark method as endpoint.
        route:arg route to the endpoint
        methods:arg subset of ["POST", "GET", "DELETE", "PATCH"]
        """

        def wrapper(func):
            setattr(func, cls.route_marker, route)
            setattr(func, cls.method_marker, methods)

            @wraps(func)
            def inner(*args, **kwargs):
                return func(*args, **kwargs)

            return inner

        return wrapper


def init_api_rules(mikado_apis, serializers, deserializers, session):
    RaclottoApi.session = session
    RaclottoApi.serializers = serializers
    RaclottoApi.deserializers = deserializers

    api_rules = Blueprint("api_rules", __name__, url_prefix="/api")
    for api in mikado_apis:
        api_rules.register_blueprint(api.get_blueprint())

    return api_rules