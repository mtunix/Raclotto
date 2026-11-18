import unittest

from pydantic import BaseModel, TypeAdapter

from back.src.api.base_api import TypedEndpoint
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
        self.assertEqual(response.json, {
            "id": level.id,
            "name": level.name,
            "label_en": level.label_en,
            "label_de": level.label_de,
            "required_experience": level.required_experience,
        })

    def test_missing_level_keeps_error_format(self):
        response = self.call("GET", "/levels/9999", self.user)

        [error] = self.assert_errors(response, 404)
        self.assertEqual(error.code, "api_error_code.resource_not_found")
        self.assertEqual(response.json["jsonapi"], {"version": "1.0"})

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
        response = self.client.post(
            "/api/probe/echo", data="{not json", headers={"Content-Type": "application/json"}
        )

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
        [error] = self.assert_errors(self.call("GET", "/probe/untyped-result"), 500)
        self.assertIn("declares response=ProbeDto but returned dict", error.detail)

    def test_no_content(self):
        response = self.call("DELETE", "/probe/3")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.get_data(), b"")

    def test_typed_endpoints_accept_both_json_media_types(self):
        for media_type in ("application/json", "application/vnd.api+json"):
            with self.subTest(media_type):
                response = self.client.post(
                    "/api/probe/echo",
                    data=ProbeBody(name="x", count=1).model_dump_json(),
                    headers={"Content-Type": media_type, "Accept": media_type},
                )
                self.assertEqual(response.status_code, 201, response.json)
        for accept in ("*/*", "application/*", None):
            with self.subTest(accept=accept):
                headers = {**self.bearer(self.user), **({"Accept": accept} if accept else {})}
                self.assertEqual(self.client.get("/api/levels", headers=headers).status_code, 200)

    def test_typed_endpoints_reject_other_media_types(self):
        response = self.client.get("/api/levels", headers={**self.bearer(self.user), "Accept": "text/html"})
        self.assert_errors(response, 406)

        response = self.client.post(
            "/api/probe/echo", data="name=x", headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        self.assert_errors(response, 415)

    def test_legacy_endpoints_still_require_json_api_media_type(self):
        response = self.client.get(
            "/api/achievements", headers={**self.bearer(self.user), "Accept": "application/json"}
        )
        self.assert_errors(response, 406)

        response = self.client.post(
            "/api/insults",
            json={"data": {"attributes": {"text": "Soggy"}}},
            headers={**self.bearer(self.user), "Accept": "application/vnd.api+json"},
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
                args = {"query": None, "body": None, "response": None, "status": 200, "operation_id": None}
                with self.assertRaises((ValueError, TypeError)):
                    TypedEndpoint.declare(methods, **{**args, **kwargs})
