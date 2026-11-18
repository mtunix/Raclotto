import enum
import unittest

from flask import Flask

from back.src.api.base_api import BaseApi, init_api_rules
from back.src.api.openapi import SPEC_PATH, build_openapi, render_openapi
from back.src.driver.database import db
from back.src.dto.base import RequestDto, ResponseDto
from back.test.integration.probe_api import ProbeApi
from back.test.support import get_app

ERROR_REF = {"$ref": "#/components/schemas/ErrorResponseDto"}


def _error(description: str) -> dict:
    return {"description": description, "content": {"application/json": {"schema": ERROR_REF}}}


def _bare_app(*apis) -> Flask:
    app = Flask(__name__)
    app.register_blueprint(init_api_rules(list(apis), db.session))
    return app


class CommittedSpecTest(unittest.TestCase):
    def test_committed_spec_is_up_to_date(self):
        expected = render_openapi(build_openapi(get_app()))

        self.assertTrue(
            SPEC_PATH.exists() and SPEC_PATH.read_text() == expected,
            f"{SPEC_PATH} is out of date with the typed endpoints; run `cd front && npm run gen:api`",
        )


class LevelsSpecTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = build_openapi(get_app())

    def test_document_header(self):
        self.assertEqual(self.spec["openapi"], "3.1.0")
        self.assertEqual(self.spec["servers"], [{"url": "/api"}])
        self.assertEqual(
            self.spec["components"]["securitySchemes"]["bearerAuth"],
            {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"},
        )

    def test_list_levels(self):
        operation = self.spec["paths"]["/levels"]["get"]

        self.assertEqual(operation["operationId"], "listLevels")
        self.assertEqual(operation["tags"], ["levels"])
        self.assertEqual(operation["summary"], "List all levels ordered by required experience.")
        self.assertEqual(operation["security"], [{"bearerAuth": []}])
        self.assertNotIn("parameters", operation)
        self.assertEqual(operation["responses"], {
            "200": {"description": "OK", "content": {"application/json": {"schema": {
                "type": "array", "items": {"$ref": "#/components/schemas/LevelDto"},
            }}}},
            "401": _error("Unauthorized"),
        })

    def test_get_level(self):
        operation = self.spec["paths"]["/levels/{level_id}"]["get"]

        self.assertEqual(operation["operationId"], "getLevel")
        self.assertEqual(operation["parameters"], [
            {"name": "level_id", "in": "path", "required": True, "schema": {"type": "integer"}},
        ])
        self.assertEqual(set(operation["responses"]), {"200", "401", "404"})
        self.assertEqual(operation["responses"]["404"], _error("Not Found"))

    def test_level_dto_schema(self):
        schema = self.spec["components"]["schemas"]["LevelDto"]

        self.assertEqual(
            set(schema["required"]), {"id", "name", "label_en", "label_de", "required_experience"}
        )

    def test_legacy_endpoints_are_left_out(self):
        self.assertEqual(set(self.spec["paths"]), {"/levels", "/levels/{level_id}"})


class ProbeSpecTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = build_openapi(_bare_app(ProbeApi))

    def test_query_and_body(self):
        operation = self.spec["paths"]["/probe/echo"]["post"]

        self.assertEqual(operation["operationId"], "echo")
        self.assertEqual(
            [(p["name"], p["in"], p["required"], p["schema"]["type"]) for p in operation["parameters"]],
            [("limit", "query", False, "integer"), ("tags", "query", False, "array")],
        )
        self.assertEqual(operation["requestBody"], {
            "required": True,
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ProbeBody"}}},
        })
        self.assertEqual(set(operation["responses"]), {"201", "400"})
        self.assertNotIn("security", operation)

    def test_query_dto_has_no_schema_of_its_own(self):
        self.assertNotIn("ProbeQuery", self.spec["components"]["schemas"])
        self.assertEqual(self.spec["components"]["schemas"]["ProbeBody"]["additionalProperties"], False)

    def test_no_content(self):
        operation = self.spec["paths"]["/probe/{probe_id}"]["delete"]

        self.assertEqual(operation["responses"]["204"], {"description": "No Content"})
        self.assertEqual(operation["operationId"], "deleteProbe")

    def test_response_defaults_are_required(self):
        class DefaultedDto(ResponseDto):
            tags: list[str] = []

        class DefaultedApi(BaseApi):
            url_prefix = "/defaulted"

            @BaseApi.endpoint("", ["GET"], response=DefaultedDto)
            def get_defaulted(self):
                pass

        schema = build_openapi(_bare_app(DefaultedApi))["components"]["schemas"]["DefaultedDto"]
        self.assertEqual(schema["required"], ["tags"])

    def test_enums_carry_member_names(self):
        class Shade(enum.IntEnum):
            LIGHT = 0
            DARK = 1

        class ShadedDto(ResponseDto):
            shade: Shade

        class ShadedApi(BaseApi):
            url_prefix = "/shaded"

            @BaseApi.endpoint("", ["GET"], response=ShadedDto)
            def get_shaded(self):
                pass

        schema = build_openapi(_bare_app(ShadedApi))["components"]["schemas"]["Shade"]
        self.assertEqual(schema["enum"], [0, 1])
        self.assertEqual(schema["x-enum-varnames"], ["LIGHT", "DARK"])


class SpecConsistencyTest(unittest.TestCase):
    def test_operation_ids_must_be_unique(self):
        class OneDto(ResponseDto):
            id: int

        class FirstApi(BaseApi):
            url_prefix = "/first"

            @BaseApi.endpoint("", ["GET"], response=OneDto)
            def list_things(self):
                pass

        class SecondApi(BaseApi):
            url_prefix = "/second"

            @BaseApi.endpoint("", ["GET"], response=OneDto)
            def list_things(self):
                pass

        with self.assertRaisesRegex(ValueError, "operationId 'listThings' is used by GET /first and GET /second"):
            build_openapi(_bare_app(FirstApi, SecondApi))

    def test_dto_names_must_be_unique(self):
        def make_dto(id_type: type):
            class SameNameDto(ResponseDto):
                id: id_type

            return SameNameDto

        first, second = make_dto(int), make_dto(str)

        class ClashApi(BaseApi):
            url_prefix = "/clash"

            @BaseApi.endpoint("/a", ["GET"], response=first)
            def get_a(self):
                pass

            @BaseApi.endpoint("/b", ["GET"], response=second)
            def get_b(self):
                pass

        with self.assertRaisesRegex(ValueError, "ambiguous"):
            build_openapi(_bare_app(ClashApi))

    def test_dto_used_both_ways_must_have_one_schema(self):
        class TwoWayDto(RequestDto, ResponseDto):
            tags: list[str] = []

        class TwoWayApi(BaseApi):
            url_prefix = "/two-way"

            @BaseApi.endpoint("", ["POST"], body=TwoWayDto, response=TwoWayDto)
            def two_way(self, body):
                pass

        with self.assertRaisesRegex(ValueError, "TwoWayDto has different request and response schemas"):
            build_openapi(_bare_app(TwoWayApi))
