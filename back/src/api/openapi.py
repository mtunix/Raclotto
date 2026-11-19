"""OpenAPI 3.1 document of the API, built from the `BaseApi.endpoint` declarations.

`venv/bin/python -m back.src.api.openapi` (from the repo root) writes `back/openapi.json`, the
input of the frontend's generated client.
"""

import inspect
import json
import re
from dataclasses import dataclass
from http import HTTPStatus
from pathlib import Path
from typing import Any, Callable, Dict, Iterator, List, Optional, Set, Tuple, Type

from flask import Flask
from pydantic import BaseModel
from pydantic.json_schema import GenerateJsonSchema, JsonSchemaMode, JsonSchemaValue, models_json_schema
from pydantic_core import core_schema

from back.src.api.base_api import AUTH_GUARD, BaseApi, TypedEndpoint, typed_endpoint
from back.src.dto.base import ErrorResponseDto
from back.src.utils import to_camel_case

API_PREFIX = "/api"
SPEC_PATH = Path(__file__).resolve().parents[2] / "openapi.json"
REF_TEMPLATE = "#/components/schemas/{model}"
SECURITY_SCHEME = "bearerAuth"

_PATH_ARG = re.compile(r"<(?:(?P<converter>\w+)(?:\([^)]*\))?:)?(?P<name>\w+)>")
_PATH_ARG_SCHEMAS = {
    "default": {"type": "string"},
    "string": {"type": "string"},
    "path": {"type": "string"},
    "int": {"type": "integer"},
    "float": {"type": "number"},
    "uuid": {"type": "string", "format": "uuid"},
}
_SCHEMA_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")

# models_json_schema's result, keyed by (DTO class, mode); pydantic types the class with a private dataclass type.
_Refs = Dict[Tuple[Type[Any], JsonSchemaMode], JsonSchemaValue]


class _SchemaGenerator(GenerateJsonSchema):
    def enum_schema(self, schema: core_schema.EnumSchema) -> JsonSchemaValue:
        # orval names the generated enum constants after the Python members instead of their values.
        json_schema = super().enum_schema(schema)
        json_schema["x-enum-varnames"] = [member.name for member in schema["members"]]
        return json_schema


@dataclass(frozen=True)
class _Operation:
    path: str
    method: str
    tag: str
    operation_id: str
    func: Callable[..., Any]
    typed: TypedEndpoint
    path_args: List[Tuple[str, str]]

    @property
    def requires_auth(self) -> bool:
        return getattr(self.func, AUTH_GUARD, None) is not None

    @property
    def summary(self) -> str:
        return (inspect.getdoc(self.func) or "").split("\n")[0]


def build_openapi(app: Flask) -> Dict[str, Any]:
    operations = sorted(_operations(app), key=lambda op: (op.path, op.method))
    _check_unique_operation_ids(operations)

    schema_inputs = _schema_inputs(operations)
    refs, defs = models_json_schema(schema_inputs, ref_template=REF_TEMPLATE, schema_generator=_SchemaGenerator)
    schemas: Dict[str, Any] = defs.get("$defs", {})
    _check_schema_names(schemas)

    paths: Dict[str, Dict[str, Any]] = {}
    for op in operations:
        paths.setdefault(op.path, {})[op.method] = _operation(op, refs, schemas)

    # Query DTOs become parameters; drop their own schema unless something else refers to it.
    for name in {_ref_name(refs[(op.typed.query, "validation")]) for op in operations if op.typed.query}:
        others = [schema for other, schema in schemas.items() if other != name]
        if REF_TEMPLATE.format(model=name) not in _refs([paths, others]):
            del schemas[name]

    spec = {
        "openapi": "3.1.0",
        "info": {"title": "Raclotto API", "version": "1.0.0"},
        "servers": [{"url": API_PREFIX}],
        "paths": paths,
        "components": {
            "schemas": schemas,
            "securitySchemes": {SECURITY_SCHEME: {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}},
        },
    }
    _check_refs_resolve(spec)
    return spec


def render_openapi(spec: Dict[str, Any]) -> str:
    return json.dumps(spec, indent=2, sort_keys=True) + "\n"


def _operations(app: Flask) -> Iterator[_Operation]:
    for rule in app.url_map.iter_rules():
        view_class = getattr(app.view_functions.get(rule.endpoint), "view_class", None)
        if view_class is None or not issubclass(view_class, BaseApi):
            continue
        func = BaseApi.endpoints[".".join(rule.endpoint.split(".")[-2:])]
        typed = typed_endpoint(func)
        if not rule.rule.startswith(API_PREFIX + "/"):
            raise ValueError(f"endpoint {rule.rule} is not mounted below {API_PREFIX}")
        tag = view_class.url_prefix.strip("/")
        if not tag:
            raise ValueError(f"{view_class.__name__} needs a url_prefix to tag its operations")
        path = rule.rule[len(API_PREFIX) :]
        yield _Operation(
            path=_PATH_ARG.sub(lambda m: "{" + m["name"] + "}", path),
            method=getattr(func, BaseApi.method_marker)[0].lower(),
            tag=tag,
            operation_id=typed.operation_id or to_camel_case(func.__name__),
            func=func,
            typed=typed,
            path_args=[(m["name"], m["converter"] or "default") for m in _PATH_ARG.finditer(path)],
        )


def _check_unique_operation_ids(operations: List[_Operation]) -> None:
    seen: Dict[str, _Operation] = {}
    for op in operations:
        other = seen.setdefault(op.operation_id, op)
        if other is not op:
            raise ValueError(
                f"operationId {op.operation_id!r} is used by {other.method.upper()} {other.path} "
                f"and {op.method.upper()} {op.path}; pass operation_id= to tell them apart"
            )


def _schema_inputs(operations: List[_Operation]) -> List[Tuple[Type[BaseModel], JsonSchemaMode]]:
    inputs: List[Tuple[Type[BaseModel], JsonSchemaMode]] = [(ErrorResponseDto, "serialization")]
    for op in operations:
        candidates: Tuple[Tuple[Optional[Type[BaseModel]], JsonSchemaMode], ...] = (
            (op.typed.query, "validation"),
            (op.typed.body, "validation"),
            (op.typed.response_model, "serialization"),
        )
        for model, mode in candidates:
            if model is not None and (model, mode) not in inputs:
                inputs.append((model, mode))
    return inputs


def _check_schema_names(schemas: Dict[str, Any]) -> None:
    for name in schemas:
        if name.endswith(("-Input", "-Output")):
            raise ValueError(
                f"{name[: name.rindex('-')]} has different request and response schemas; "
                "use separate request and response DTOs"
            )
        if not _SCHEMA_NAME.match(name) or "__" in name:
            raise ValueError(f"schema name {name!r} is ambiguous; give the DTO classes unique names")


def _operation(op: _Operation, refs: _Refs, schemas: Dict[str, Any]) -> Dict[str, Any]:
    typed = op.typed
    operation: Dict[str, Any] = {
        "operationId": op.operation_id,
        "tags": [op.tag],
        "responses": _responses(op, refs),
    }
    if op.summary:
        operation["summary"] = op.summary

    parameters = [
        {"name": name, "in": "path", "required": True, "schema": _path_arg_schema(converter, op)}
        for name, converter in op.path_args
    ]
    if typed.query is not None:
        query_schema = schemas[_ref_name(refs[(typed.query, "validation")])]
        required = set(query_schema.get("required", []))
        parameters += [
            {"name": name, "in": "query", "required": name in required, "schema": schema}
            for name, schema in query_schema["properties"].items()
        ]
    if parameters:
        operation["parameters"] = parameters

    if typed.body is not None:
        operation["requestBody"] = {
            "required": True,
            "content": {"application/json": {"schema": refs[(typed.body, "validation")]}},
        }
    if op.requires_auth:
        operation["security"] = [{SECURITY_SCHEME: []}]
    return operation


def _responses(op: _Operation, refs: _Refs) -> Dict[str, Any]:
    typed = op.typed
    success: Dict[str, Any] = {"description": HTTPStatus(typed.status).phrase}
    model = typed.response_model
    if model is not None:
        schema = refs[(model, "serialization")]
        if typed.response is not model:
            schema = {"type": "array", "items": schema}
        success["content"] = {"application/json": {"schema": schema}}

    error = refs[(ErrorResponseDto, "serialization")]
    responses = {str(typed.status): success}
    for status in error_statuses(op.typed, op.requires_auth):
        responses[str(status)] = {
            "description": HTTPStatus(status).phrase,
            "content": {"application/json": {"schema": error}},
        }
    return responses


def error_statuses(typed: TypedEndpoint, requires_auth: bool) -> List[int]:
    """The declared error statuses plus 400 for request DTOs and 401 for the auth guard."""
    statuses = set(typed.errors)
    if typed.query is not None or typed.body is not None:
        statuses.add(HTTPStatus.BAD_REQUEST.value)
    if requires_auth:
        statuses.add(HTTPStatus.UNAUTHORIZED.value)
    return sorted(statuses)


def _path_arg_schema(converter: str, op: _Operation) -> Dict[str, Any]:
    if converter not in _PATH_ARG_SCHEMAS:
        raise ValueError(f"{op.method.upper()} {op.path}: no schema for path converter {converter!r}")
    return dict(_PATH_ARG_SCHEMAS[converter])


def _ref_name(ref: Dict[str, str]) -> str:
    return ref["$ref"].rsplit("/", 1)[1]


def _refs(node: Any) -> Set[str]:
    if isinstance(node, dict):
        found = {node["$ref"]} if isinstance(node.get("$ref"), str) else set()
        return found.union(*(_refs(value) for value in node.values()))
    if isinstance(node, list):
        return set().union(*(_refs(value) for value in node))
    return set()


def _check_refs_resolve(spec: Dict[str, Any]) -> None:
    known = {REF_TEMPLATE.format(model=name) for name in spec["components"]["schemas"]}
    dangling = _refs(spec) - known
    if dangling:
        raise ValueError(f"unresolved schema references: {sorted(dangling)}")


def main() -> None:
    from back.src.driver.app import App
    from back.src.driver.config import ConfigInMemory
    from back.src.driver.database import db

    app = App("raclotto-openapi", db, ConfigInMemory)
    SPEC_PATH.write_text(render_openapi(build_openapi(app)))
    print(f"wrote {SPEC_PATH}")


if __name__ == "__main__":
    main()
