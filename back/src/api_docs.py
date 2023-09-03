import json
import re

from docstring_parser.parser import parse

from driver.api_custom import apis_custom
from driver.app import App
from driver.config import ConfigInMemory
from driver.database import db
from driver.api_generated import apis_generated

doc = {"components": [], "paths": []}
app = App("dummy", db, ConfigInMemory)


def is_enum(t):
    return hasattr(t, "name") and hasattr(t, "enums")


def get_type(t):
    if is_enum(t):
        return f"{t.name} (enum)"
    else:
        return str(t)


def get_relationships(s):
    rs = []
    if hasattr(s, "many_to_one_relationships"):
        for r in s.many_to_one_relationships:
            rs.append({f"type": r, "cardinality": "many to one"})
    if hasattr(s, "relationship_columns"):
        for r in s.relationship_columns:
            if hasattr(s,
                       "many_to_one_relationships") and r not in s.many_to_one_relationships:
                rs.append({f"type": r, "cardinality": "one to many"})
    return rs


"""Add components, enums and json api endpoints to `doc`."""
for model, methods, _, _ in apis_generated:
    api = app.manager.created_apis_for[model]
    data = [{"name": c.name, "type": get_type(c.type)} for c in
            model.__table__.columns if not c.foreign_keys]
    relationships = get_relationships(api.serializer)
    enums = [c.type for c in model.__table__.columns if is_enum(c.type)]
    for e in enums:
        if e.name not in [c["name"] for c in doc["components"]]:
            doc["components"].append({
                "name": get_type(e),
                "values": e.enums
            })

    doc["paths"].append({
        "api_type": "rest",
        "url": f"{api.url_prefix}/{api.collection_name}",
        "methods": methods,
        "status_codes": [{"code": 200, "description": "OK"}],
        "description": f"JSON API conforming REST API endpoint for {api.collection_name}.",
        "path_params": f"As specified by JSON API.",
        "url_params": f"As specified by JSON API.",
        "resource": {
            "type": api.collection_name,
            "data": data,
            "relationships": relationships
        },
    })

for api in apis_custom:
    url_prefix = app.manager.url_prefix
    url_prefix += api.url_prefix
    for endpoint in api.get_api_endpoints():
        doc_str = parse(endpoint.__doc__)

        path_params = []
        url_params = []
        body = []
        for param in doc_str.meta:
            if param.args[0] in ["path_param", "url_param"]:
                key, type_name, arg_name = param.args
                required = True
                if type_name.endswith("?"):
                    required = False
                    type_name = type_name[:-1]

                match = re.match(r"^Defaults to (.+)\. ", param.description)
                if match:
                    default = match.group(1)
                    desc = param.description.replace(match.group(0), "")
                else:
                    default = None
                    desc = param.description
                desc = desc.replace("\n", " ")

                param_args = {
                    "name": arg_name,
                    "type": type_name,
                    "description": desc,
                    "required": required,
                    "default": default
                }

                if param.args[0] == "path_param":
                    path_params.append(param_args)
                elif param.args[0] == "url_param":
                    url_params.append(param_args)
            if param.args[0] == "body":
                key, type_name, name = param.args
                desc = param.description.replace("\n", " ")
                match = re.match(r"^Requires: (.+)\. ", param.description)
                if match:
                    required = match.group(1)
                    required = required.split(", ")
                else:
                    required = []
                body.append({
                    "name": name,
                    "schema": {
                        "type": type_name,
                        "required": required
                    },
                    "description": desc
                })

        status_codes = []
        for param in doc_str.meta:
            if param.args[0] == "status_code":
                status_code = param.args[1]
                desc = param.description.replace("\n", " ")
                status_codes.append({
                    "code": status_code,
                    "description": desc
                })

        doc["paths"].append({
            "api_type": "use_case",
            "url": url_prefix + getattr(endpoint, api.route_marker),
            "methods": getattr(endpoint, api.method_marker),
            "description": doc_str.long_description.replace(
                "\n", " ") if doc_str.long_description else "",
            "path_params": path_params,
            "url_params": url_params,
            "status_codes": status_codes,
            "body": body,
            "returns": {
                "type": doc_str.returns.type_name if doc_str.returns else None,
                "description": doc_str.returns.description.replace(
                    "\n", " ") if doc_str.returns else None
            }
        })

open_api_spec = {
    "openapi": "3.0.0",
    "info": {
        "title": "Raclotto API",
        "description": "Raclotto API",
        "version": "0.0.1",
    },
    "contact": {
        "name": "mtunix",
        "email": "https://github.com/mtunix",
    },
    "servers": [{
        "url": "http://127.0.0.1:3001",
        "description": "Development server"
    }],
    "components": {
        "schemas": {

        }
    },
    "paths": {},
}


def transform_sql_types(sql_type):
    """
    Transforms SQL types to OpenAPI types.
    :param sql_type: SQL data type
    :return: OpenAPI data type
    """
    if "varchar" in sql_type.lower():
        return "string"
    if sql_type.lower() == "float":
        return "number"
    if sql_type.lower() == "blob":
        return "binary"

    return sql_type.lower()


def define_components(open_api_spec, path):
    """
    Iterates over all paths and defines the components for the OpenAPI spec.
    The path contains the resource type and the data, which is used to define the components.
    :param open_api_spec: dict describing the OpenAPI spec
    :param path: dict describing an endpoint
    :return: open_api_spec (note that it is modified in place and is only returned for readability)
    """
    for enum in doc["components"]:
        open_api_spec["components"]["schemas"][enum["name"]] = {
            "type": "string",
            "enum": enum["values"]
        }

    open_api_spec["components"]["schemas"]["None"] = {}
    open_api_spec["components"]["schemas"]["dict"] = {}

    if "resource" not in path:
        return open_api_spec

    open_api_spec["components"]["schemas"][path["resource"]["type"]] = {
        "type": "object",
        "properties": {}
    }

    properties = open_api_spec["components"]["schemas"][path["resource"]["type"]]["properties"]

    for prop in path["resource"]["data"]:
        properties[prop["name"]] = {
            "type": transform_sql_types(prop["type"]),
        }

        if "enum" in prop["type"]:
            properties[prop["name"]][
                "$ref"] = f"#/components/schemas/{prop['type']}"

    return open_api_spec


def _get_json_api_params(path):
    return [
        {
            "name": path["path_params"],
            "in": "path",
            "required": False,
            "schema": {
                "type": "string"
            },
            "content": {
                "application/vnd.api+json": {
                    "schema": {
                        "type": "object"
                    }
                }
            }
        },
        {
            "name": path["url_params"],
            "in": "query",
            "required": False,
            "schema": {
                "type": "string"
            },
            "content": {
                "application/vnd.api+json": {
                    "schema": {
                        "type": "object"
                    }
                }
            }
        },
    ]


def _get_custom_api_params(path):
    params = []

    for param in path["path_params"]:
        params.append({
            "name": param["name"],
            "in": "path",
            "required": False,
            "schema": {
                "type": "string"
            },
            "description": param["description"]
        })

    for param in path["url_params"]:
        params.append({
            "name": param["name"],
            "in": "query",
            "required": False,
            "schema": {
                "type": "string"
            },
            "description": param["description"]
        })

    return params


def _get_external_json_api_docs():
    return {
        "description": "JSON API specification",
        "url": "https://jsonapi.org/"
    }


def _get_api_responses(path):
    responses = {}

    if "resource" not in path:
        api_ref = f"#/components/schemas/{path['returns']['type']}"
    else:
        api_ref = f"#/components/schemas/{path['resource']['type']}"

    for status_code in path["status_codes"]:
        responses[status_code["code"]] = {
            "description": status_code["description"],
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": api_ref
                    }
                }
            }
        }

    return responses


for path in doc["paths"]:
    open_api_spec = define_components(open_api_spec, path)
    open_api_spec["paths"][path["url"]] = {}

    tag = "REST" if path["api_type"] == "rest" else "Use Case"
    params = _get_json_api_params(path) if path["api_type"] == "rest" else _get_custom_api_params(path)
    external_docs = "" if path["api_type"] == "rest" else ""

    for method in path["methods"]:
        open_api_spec["paths"][path["url"]][method.lower()] = {
            "summary": path["description"],
            "tags": [tag],
            "parameters": params,
            "responses": _get_api_responses(path),
            "externalDocs": external_docs
        }

with open("mikado_spec.json", "w") as f:
    f.write(json.dumps(open_api_spec))