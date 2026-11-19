import unittest
from typing import Any, Dict

from pydantic import BaseModel, TypeAdapter

from back.src.api.base_api import BaseApi, TypedEndpoint
from back.src.dto.base import ApiErrorDto, ErrorResponseDto
from back.src.dto.level import LevelDto
from back.src.repository.level_repository import LevelRepository
from back.test.integration.probe_api import ProbeApi, ProbeBody
from back.test.support import AppTest


class TypedEndpointTest(AppTest):
    extra_apis = (ProbeApi,)

    def setUp(self):
        super().setUp()
        self.user = self.make_user("alice")

    def assert_errors(self, response, status: int) -> list:
        self.assertEqual(response.status_code, status, response.get_data(as_text=True))
        body = ErrorResponseDto.model_validate(response.json)
        self.assertEqual(set(response.json), set(ErrorResponseDto.model_fields))
        for error in response.json["errors"]:
            self.assertEqual(set(error), set(ApiErrorDto.model_fields))
        return body.errors

    def test_list_levels_is_plain_json(self):
        response = self.call("GET", "/levels", self.user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "application/json")
        levels = TypeAdapter(list[LevelDto]).validate_python(response.json)
        self.assertEqual(
            [level.id for level in levels],
            [level.id for level in LevelRepository().all_ordered()],
        )
        self.assertEqual(set(response.json[0]), set(LevelDto.model_fields))

    def test_get_level(self):
        level = LevelRepository().all_ordered()[1]

        response = self.call("GET", f"/levels/{level.id}", self.user)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json,
            {
                "id": level.id,
                "name": level.name,
                "label_en": level.label_en,
                "label_de": level.label_de,
                "required_experience": level.required_experience,
            },
        )

    def test_missing_level_is_an_error_body(self):
        response = self.call("GET", "/levels/9999", self.user)

        [error] = self.assert_errors(response, 404)
        self.assertEqual(error.code, "api_error_code.resource_not_found")
        self.assertEqual(set(response.json), {"errors"})

    def test_unknown_endpoint_is_an_error_body(self):
        [error] = self.assert_errors(self.call("GET", "/nowhere"), 404)
        self.assertEqual(error.code, "api_error_code.endpoint_not_found")

    def test_levels_require_auth(self):
        [error] = self.assert_errors(self.call("GET", "/levels"), 401)
        self.assertEqual(error.code, "api_error_code.invalid_token")

    def test_invalid_body_reports_each_field(self):
        response = self.call("POST", "/probe/echo", body={"name": 5, "extra": True}, query={"limit": "many"})

        errors = self.assert_errors(response, 400)
        self.assertEqual(
            {error.source.pointer for error in errors},
            {"/query/limit", "/body/name", "/body/count", "/body/extra"},
        )
        self.assertTrue(all(error.status == 400 for error in errors))
        self.assertEqual(len({error.id_ for error in errors}), len(errors))

    def test_malformed_json_points_at_body(self):
        response = self.client.post("/api/probe/echo", data="{not json", headers={"Content-Type": "application/json"})

        [error] = self.assert_errors(response, 400)
        self.assertEqual(error.source.pointer, "/body")

    def test_valid_request_reaches_handler_as_dtos(self):
        response = self.call("POST", "/probe/echo", body={"name": "pan", "count": 2}, query={"tags": ["a", "b"]})

        self.assertEqual(response.status_code, 201, response.json)
        self.assertEqual(response.json, {"name": "pan", "count": 2, "limit": 10, "tags": ["a", "b"]})

    def test_unauthenticated_invalid_body_gets_401(self):
        self.assert_errors(self.call("POST", "/probe/secure", body={"name": 5}), 401)

    def test_authenticated_invalid_body_gets_400(self):
        [error] = self.assert_errors(self.call("POST", "/probe/secure", self.user, body={"name": "x"}), 400)
        self.assertEqual(error.source.pointer, "/body/count")

    def test_authenticated_valid_body_succeeds(self):
        response = self.call("POST", "/probe/secure", self.user, body={"name": "x", "count": 1})

        self.assertEqual(response.status_code, 200, response.json)

    def test_handler_returning_a_non_dto_fails_loudly(self):
        with self.assertLogs(level="ERROR") as logs:
            self.assert_errors(self.call("GET", "/probe/untyped-result"), 500)
        self.assertIn("declares response=ProbeDto but returned dict", "\n".join(logs.output))

    def test_an_unexpected_error_is_logged_and_kept_from_the_client(self):
        with self.assertLogs(level="ERROR") as logs:
            [error] = self.assert_errors(self.call("GET", "/probe/crash"), 500)

        self.assertEqual((error.code, error.title), ("api_error_code.internal_error", "Internal Server Error"))
        self.assertNotIn("secret internals", str(error.model_dump()))
        log = "\n".join(logs.output)
        self.assertIn("secret internals", log)
        self.assertIn(error.id_, log)

    def test_no_content(self):
        response = self.call("DELETE", "/probe/3")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.get_data(), b"")
        self.assertNotIn("Content-Type", response.headers)

    def test_endpoints_accept_json(self):
        response = self.client.post(
            "/api/probe/echo",
            data=ProbeBody(name="x", count=1).model_dump_json(),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        self.assertEqual(response.status_code, 201, response.json)
        for accept in ("*/*", "application/*", None):
            with self.subTest(accept=accept):
                headers = {**self.bearer(self.user), **({"Accept": accept} if accept else {})}
                self.assertEqual(self.client.get("/api/levels", headers=headers).status_code, 200)

    def test_endpoints_reject_other_media_types(self):
        for accept in ("text/html", "application/vnd.api+json"):
            with self.subTest(accept=accept):
                response = self.client.get("/api/levels", headers={**self.bearer(self.user), "Accept": accept})
                self.assert_errors(response, 406)

        for content_type in ("application/x-www-form-urlencoded", "application/vnd.api+json"):
            with self.subTest(content_type=content_type):
                response = self.client.post(
                    "/api/probe/echo",
                    data=ProbeBody(name="x", count=1).model_dump_json(),
                    headers={"Content-Type": content_type},
                )
                self.assert_errors(response, 415)


class TypedEndpointDeclarationTest(unittest.TestCase):
    def test_rejects_inconsistent_declarations(self):
        class Dto(BaseModel):
            pass

        for methods, kwargs in (
            (["GET", "POST"], {"response": Dto}),
            (["GET"], {"response": Dto, "status": 204}),
            (["POST"], {"body": Dto}),
            (["GET"], {"body": Dto, "response": Dto}),
            (["GET"], {"response": dict}),
            (["GET"], {"response": list[dict]}),
        ):
            with self.subTest(methods=methods, **{k: repr(v) for k, v in kwargs.items()}):
                args: Dict[str, Any] = {
                    "query": None,
                    "body": None,
                    "response": None,
                    "status": 200,
                    "operation_id": None,
                    **kwargs,
                }
                with self.assertRaises((ValueError, TypeError)):
                    TypedEndpoint.declare(methods, **args)

    def test_rejects_an_endpoint_without_a_response(self):
        with self.assertRaises(ValueError):

            class UndeclaredApi(BaseApi):
                @BaseApi.endpoint("/undeclared", ["GET"])
                def undeclared(self):
                    pass
