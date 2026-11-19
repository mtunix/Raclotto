import enum
import re
import unittest
from typing import Any

from flask import Flask

from back.src.api.base_api import BaseApi, init_api_rules
from back.src.api.openapi import SPEC_PATH, build_openapi, render_openapi
from back.src.driver.api_custom import apis_custom
from back.src.driver.database import db
from back.src.dto.base import RequestDto, ResponseDto
from back.src.utils import un_camel_case
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
            f"{SPEC_PATH} is out of date with the endpoints; run `cd front && npm run gen:api`",
        )


class LevelsSpecTest(unittest.TestCase):
    spec: dict[str, Any]

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
        self.assertEqual(
            operation["responses"],
            {
                "200": {
                    "description": "OK",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/LevelDto"},
                            }
                        }
                    },
                },
                "401": _error("Unauthorized"),
            },
        )

    def test_get_level(self):
        operation = self.spec["paths"]["/levels/{level_id}"]["get"]

        self.assertEqual(operation["operationId"], "getLevel")
        self.assertEqual(
            operation["parameters"],
            [
                {"name": "level_id", "in": "path", "required": True, "schema": {"type": "integer"}},
            ],
        )
        self.assertEqual(set(operation["responses"]), {"200", "401", "404"})
        self.assertEqual(operation["responses"]["404"], _error("Not Found"))

    def test_level_dto_schema(self):
        schema = self.spec["components"]["schemas"]["LevelDto"]

        self.assertEqual(set(schema["required"]), {"id", "name", "label_en", "label_de", "required_experience"})

    def test_every_path_is_in_the_spec(self):
        self.assertEqual(
            set(self.spec["paths"]),
            {
                "/levels",
                "/levels/{level_id}",
                "/pans",
                "/pans/filters",
                "/pans/generate",
                "/pans/generate/bandit",
                "/pans/{pan_id}",
                "/ratings",
                "/ratings/{rating_id}",
                "/auth/register",
                "/auth/login",
                "/auth/me",
                "/auth/invite/{token}",
                "/auth/refresh",
                "/auth/password",
                "/invites",
                "/invites/{invite_id}",
                "/users",
                "/users/{user_id}",
                "/users/{user_id}/stats",
                "/sessions",
                "/sessions/{session_id}",
                "/sessions/by-key",
                "/sessions/close",
                "/sessions/reactivate",
                "/sessions/recap",
                "/ingredients",
                "/ingredients/{ingredient_id}",
                "/ingredients/refill",
                "/ingredients/available-counts",
                "/ingredients/export",
                "/ingredients/import",
                "/ingredients/reimport",
                "/preparation_type",
                "/preparation_type/{prep_type_id}",
                "/achievements",
                "/achievements/{achievement_id}",
                "/achievements/leaderboard",
                "/health",
                "/events",
                "/events/{event_id}/dismiss",
                "/events/configs",
                "/events/configs/{config_id}",
                "/images/generation",
                "/images/profile-picture-history/{user_id}",
                "/images/generate-banana",
                "/images/generate-profile-picture",
                "/images/set-candidate-picture/{picture_id}",
                "/insults",
                "/insults/{insult_id}",
                "/stats",
            },
        )


class PansAndRatingsSpecTest(unittest.TestCase):
    spec: dict[str, Any]
    schemas: dict[str, Any]

    @classmethod
    def setUpClass(cls):
        cls.spec = build_openapi(get_app())
        cls.schemas = cls.spec["components"]["schemas"]

    def test_operation_ids(self):
        operations = {
            (path, method): operation["operationId"]
            for path, methods in self.spec["paths"].items()
            if path.startswith(("/pans", "/ratings"))
            for method, operation in methods.items()
        }
        self.assertEqual(
            operations,
            {
                ("/pans/generate", "post"): "rollPan",
                ("/pans/generate/bandit", "post"): "rollBanditPan",
                ("/pans", "post"): "createPan",
                ("/pans", "get"): "listPans",
                ("/pans/filters", "get"): "getPanFilterOptions",
                ("/pans/{pan_id}", "get"): "getPan",
                ("/pans/{pan_id}", "patch"): "updatePan",
                ("/pans/{pan_id}", "delete"): "deletePan",
                ("/ratings", "get"): "listRatings",
                ("/ratings", "post"): "createRating",
                ("/ratings/{rating_id}", "get"): "getRating",
                ("/ratings/{rating_id}", "patch"): "updateRating",
                ("/ratings/{rating_id}", "delete"): "deleteRating",
            },
        )

    def test_roll_takes_the_session_key_and_returns_the_outcome(self):
        operation = self.spec["paths"]["/pans/generate"]["post"]

        self.assertEqual(
            [(p["name"], p["in"], p["required"]) for p in operation["parameters"]],
            [("session_key", "query", True)],
        )
        self.assertEqual(
            operation["responses"]["200"]["content"]["application/json"]["schema"],
            {"$ref": "#/components/schemas/RollOutcomeDto"},
        )

    def test_every_pan_field_is_required_and_the_author_nullable(self):
        pan = self.schemas["PanDto"]

        self.assertEqual(set(pan["required"]), set(pan["properties"]))
        self.assertEqual(
            pan["properties"]["author"]["anyOf"],
            [
                {"$ref": "#/components/schemas/UserSummaryDto"},
                {"type": "null"},
            ],
        )

    def test_patch_body_takes_only_name_and_snacked(self):
        body = self.schemas["UpdatePanBody"]

        self.assertEqual(set(body["properties"]), {"name", "snacked"})
        self.assertNotIn("required", body)
        self.assertEqual(body["additionalProperties"], False)

    def test_rating_body_has_no_user(self):
        body = self.schemas["CreateRatingBody"]

        self.assertEqual(set(body["properties"]), {"pan_id", "rating"})
        self.assertEqual(body["properties"]["rating"]["maximum"], 5)


class UsersAndAuthSpecTest(unittest.TestCase):
    spec: dict[str, Any]
    schemas: dict[str, Any]

    @classmethod
    def setUpClass(cls):
        cls.spec = build_openapi(get_app())
        cls.schemas = cls.spec["components"]["schemas"]

    def test_operation_ids_and_auth(self):
        operations = {
            (path, method): (operation["operationId"], "security" in operation)
            for path, methods in self.spec["paths"].items()
            if path.startswith(("/auth", "/invites", "/users"))
            for method, operation in methods.items()
        }
        self.assertEqual(
            operations,
            {
                ("/auth/register", "post"): ("register", False),
                ("/auth/login", "post"): ("login", False),
                ("/auth/invite/{token}", "get"): ("lookupInvite", False),
                ("/auth/me", "get"): ("getMe", True),
                ("/auth/me", "patch"): ("updateMe", True),
                ("/auth/refresh", "post"): ("refreshToken", True),
                ("/auth/password", "post"): ("changePassword", True),
                ("/invites", "post"): ("createInvite", True),
                ("/invites", "get"): ("listInvites", True),
                ("/invites/{invite_id}", "delete"): ("revokeInvite", True),
                ("/users", "get"): ("listUsers", True),
                ("/users/{user_id}", "get"): ("getUserProfile", True),
                ("/users/{user_id}", "patch"): ("updateUser", True),
                ("/users/{user_id}/stats", "get"): ("getUserStats", True),
            },
        )

    def test_public_profile_leaves_out_private_fields(self):
        profile = set(self.schemas["UserProfileDto"]["properties"])
        me = set(self.schemas["MeDto"]["properties"])

        self.assertEqual(
            me - profile,
            {
                "email",
                "language",
                "is_admin",
                "meat",
                "vegetarian",
                "vegan",
                "fish",
                "histamine",
                "fructose",
                "lactose",
                "gluten",
            },
        )
        self.assertEqual(profile - me, {"achievements"})

    def test_update_me_takes_only_optional_known_fields(self):
        body = self.schemas["UpdateMeBody"]

        self.assertNotIn("required", body)
        self.assertEqual(body["additionalProperties"], False)
        self.assertNotIn("password", body["properties"])

    def test_stats_embed_the_shared_pan_and_ingredient_shapes(self):
        stats = self.schemas["UserStatsDto"]["properties"]

        self.assertEqual(stats["most_ingredients_pan"]["anyOf"][0], {"$ref": "#/components/schemas/PanDto"})
        self.assertEqual(stats["favorite_ingredient"]["anyOf"][0], {"$ref": "#/components/schemas/IngredientDto"})


class SessionsAndIngredientsSpecTest(unittest.TestCase):
    spec: dict[str, Any]
    schemas: dict[str, Any]

    @classmethod
    def setUpClass(cls):
        cls.spec = build_openapi(get_app())
        cls.schemas = cls.spec["components"]["schemas"]

    def test_operation_ids(self):
        operations = {
            (path, method): operation["operationId"]
            for path, methods in self.spec["paths"].items()
            if path.startswith(("/sessions", "/ingredients", "/preparation_type"))
            for method, operation in methods.items()
        }
        self.assertEqual(
            operations,
            {
                ("/sessions", "post"): "createSession",
                ("/sessions", "get"): "listSessions",
                ("/sessions/{session_id}", "get"): "getSession",
                ("/sessions/by-key", "get"): "getSessionByKey",
                ("/sessions/{session_id}", "patch"): "updateSession",
                ("/sessions/{session_id}", "delete"): "deleteSession",
                ("/sessions/close", "post"): "closeSession",
                ("/sessions/reactivate", "post"): "reactivateSession",
                ("/sessions/recap", "get"): "getSessionRecap",
                ("/ingredients", "get"): "listIngredients",
                ("/ingredients", "post"): "createIngredient",
                ("/ingredients/{ingredient_id}", "get"): "getIngredient",
                ("/ingredients/{ingredient_id}", "patch"): "updateIngredient",
                ("/ingredients/{ingredient_id}", "delete"): "deleteIngredient",
                ("/ingredients/refill", "post"): "refillIngredient",
                ("/ingredients/available-counts", "get"): "getAvailableCounts",
                ("/ingredients/export", "get"): "exportIngredients",
                ("/ingredients/import", "post"): "importIngredients",
                ("/ingredients/reimport", "post"): "reimportIngredients",
                ("/preparation_type", "get"): "listPreparationTypes",
                ("/preparation_type", "post"): "createPreparationType",
                ("/preparation_type/{prep_type_id}", "delete"): "deletePreparationType",
            },
        )

    def test_the_ingredient_list_adds_only_applicable(self):
        listed = self.schemas["IngredientForUserDto"]
        plain = self.schemas["IngredientDto"]

        self.assertEqual(set(listed["properties"]) - set(plain["properties"]), {"applicable"})
        self.assertEqual(set(listed["required"]), set(listed["properties"]))

    def test_create_takes_the_session_in_the_query(self):
        operation = self.spec["paths"]["/ingredients"]["post"]

        self.assertEqual(
            [(p["name"], p["in"], p["required"]) for p in operation["parameters"]], [("session_key", "query", True)]
        )
        self.assertNotIn("session_key", self.schemas["CreateIngredientBody"]["properties"])
        self.assertEqual(self.schemas["CreateIngredientBody"]["required"], ["name", "type"])

    def test_an_imported_ingredient_is_an_exported_one(self):
        imported = set(self.schemas["ImportedIngredient"]["properties"])

        self.assertEqual(imported, set(self.schemas["IngredientDto"]["properties"]))
        self.assertEqual(
            self.schemas["ImportIngredientsBody"]["properties"]["ingredients"]["items"],
            {"$ref": "#/components/schemas/ImportedIngredient"},
        )
        self.assertEqual(
            self.schemas["IngredientExportDto"]["properties"]["ingredients"]["items"],
            {"$ref": "#/components/schemas/IngredientDto"},
        )

    def test_delete_and_import_statuses(self):
        paths = self.spec["paths"]

        self.assertEqual(
            paths["/ingredients/{ingredient_id}"]["delete"]["responses"]["204"], {"description": "No Content"}
        )
        self.assertIn("201", paths["/ingredients/import"]["post"]["responses"])
        self.assertIn("204", paths["/sessions/{session_id}"]["delete"]["responses"])
        self.assertIn("204", paths["/preparation_type/{prep_type_id}"]["delete"]["responses"])

    def test_session_timestamp_is_a_date_time(self):
        self.assertEqual(
            self.schemas["SessionDto"]["properties"]["timestamp"],
            {"format": "date-time", "title": "Timestamp", "type": "string"},
        )


class AchievementsEventsImagesInsultsStatsSpecTest(unittest.TestCase):
    spec: dict[str, Any]
    schemas: dict[str, Any]

    @classmethod
    def setUpClass(cls):
        cls.spec = build_openapi(get_app())
        cls.schemas = cls.spec["components"]["schemas"]

    def test_operation_ids_and_error_statuses(self):
        operations = {
            (path, method): (operation["operationId"], sorted(int(s) for s in operation["responses"]))
            for path, methods in self.spec["paths"].items()
            if path.startswith(("/achievements", "/events", "/images", "/insults", "/stats"))
            for method, operation in methods.items()
        }
        self.assertEqual(
            operations,
            {
                ("/achievements", "get"): ("listAchievements", [200, 401]),
                ("/achievements/{achievement_id}", "get"): ("getAchievement", [200, 401, 404]),
                ("/achievements/leaderboard", "get"): ("getLeaderboard", [200, 401]),
                ("/events", "get"): ("listEvents", [200, 400, 401, 404]),
                ("/events/{event_id}/dismiss", "post"): ("dismissEvent", [204, 401, 404]),
                ("/events/configs", "get"): ("listEventConfigs", [200, 400, 401]),
                ("/events/configs", "post"): ("saveEventConfig", [200, 400, 401, 403, 404]),
                ("/events/configs/{config_id}", "patch"): ("updateEventConfig", [200, 400, 401, 403, 404]),
                ("/images/generation", "get"): ("getImageGeneration", [200, 401]),
                ("/images/profile-picture-history/{user_id}", "get"): ("getProfilePictureHistory", [200, 401, 404]),
                ("/images/generate-banana", "post"): ("generateImage", [200, 400, 401, 500, 503]),
                ("/images/generate-profile-picture", "post"): ("generateProfilePicture", [200, 400, 401, 500, 503]),
                ("/images/set-candidate-picture/{picture_id}", "post"): ("setCandidatePicture", [204, 401, 403, 404]),
                ("/insults", "get"): ("listInsults", [200, 401]),
                ("/insults", "post"): ("createInsult", [200, 400, 401, 403]),
                ("/insults/{insult_id}", "get"): ("getInsult", [200, 401, 404]),
                ("/insults/{insult_id}", "patch"): ("updateInsult", [200, 400, 401, 403, 404]),
                ("/insults/{insult_id}", "delete"): ("deleteInsult", [204, 401, 403, 404]),
                ("/stats", "get"): ("getStats", [200, 400, 401]),
            },
        )

    def test_an_achievement_status_adds_only_unlocked_and_progress(self):
        status = self.schemas["AchievementStatusDto"]
        plain = self.schemas["AchievementDto"]

        self.assertEqual(set(status["properties"]) - set(plain["properties"]), {"unlocked", "progress"})
        self.assertEqual(set(status["required"]), set(status["properties"]))

    def test_only_known_event_types_are_configured_but_any_stored_one_is_returned(self):
        stored = {"title": "Event Type", "type": "string"}

        self.assertEqual(self.schemas["EventDto"]["properties"]["event_type"], stored)
        self.assertEqual(self.schemas["EventConfigDto"]["properties"]["event_type"], stored)
        self.assertEqual(
            self.schemas["SaveEventConfigBody"]["properties"]["event_type"], {"$ref": "#/components/schemas/EventType"}
        )
        self.assertEqual(self.schemas["EventType"]["enum"], ["pan_swap"])
        self.assertEqual(self.schemas["SaveEventConfigBody"]["required"], ["event_type", "enabled"])
        self.assertNotIn("required", self.schemas["UpdateEventConfigBody"])

    def test_stats_embed_the_shared_shapes(self):
        stats = self.schemas["StatsDto"]["properties"]

        self.assertEqual(stats["pans"]["items"], {"$ref": "#/components/schemas/PanDto"})
        self.assertEqual(stats["ingredients_top_rated"]["items"], {"$ref": "#/components/schemas/IngredientRatingDto"})
        self.assertEqual(
            self.schemas["IngredientUsageDto"]["properties"]["ingredient"],
            {"$ref": "#/components/schemas/IngredientDto"},
        )
        self.assertEqual(stats["leaderboard"]["items"], {"$ref": "#/components/schemas/LeaderboardEntryDto"})

    def test_picture_history_entries_carry_the_shared_level(self):
        level = self.schemas["ProfilePictureDto"]["properties"]["level"]

        self.assertEqual(level["anyOf"], [{"$ref": "#/components/schemas/LevelDto"}, {"type": "null"}])
        self.assertEqual(
            self.spec["paths"]["/images/profile-picture-history/{user_id}"]["get"]["responses"]["200"]["content"][
                "application/json"
            ]["schema"],
            {"type": "array", "items": {"$ref": "#/components/schemas/ProfilePictureDto"}},
        )


class EveryEndpointTypedTest(unittest.TestCase):
    def test_every_endpoint_is_in_the_spec(self):
        app = get_app()
        production = {un_camel_case(api.__name__) for api in apis_custom}
        routes = set()
        for rule in app.url_map.iter_rules():
            name = ".".join(rule.endpoint.split(".")[-2:])
            if name.split(".")[0] in production:
                path = re.sub(r"<(?:\w+:)?(\w+)>", r"{\1}", rule.rule.removeprefix("/api"))
                routes |= {(path, method.lower()) for method in getattr(BaseApi.endpoints[name], BaseApi.method_marker)}
        operations = {(path, method) for path, item in build_openapi(app)["paths"].items() for method in item}

        self.assertEqual({path.split("/")[1] for path, _ in routes}, {api.url_prefix.strip("/") for api in apis_custom})
        self.assertEqual(routes, operations)


class ProbeSpecTest(unittest.TestCase):
    spec: dict[str, Any]

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
        self.assertEqual(
            operation["requestBody"],
            {
                "required": True,
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ProbeBody"}}},
            },
        )
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
                id: id_type  # type: ignore[valid-type]  # the field type is the parameter on purpose

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
