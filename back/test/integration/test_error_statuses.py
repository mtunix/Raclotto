import unittest
from typing import Any

from flask import Flask

from back.src.api.base_api import BaseApi, TypedEndpoint, init_api_rules
from back.src.api.openapi import build_openapi
from back.src.auth.middleware import require_auth
from back.src.driver.database import db
from back.src.dto.base import RequestDto, ResponseDto
from back.src.entity.preparation_type import PreparationType
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.rating import Rating
from back.src.interactor.profile_pictures import GeminiImageGenerator, set_image_generator
from back.src.repository.preparation_type_repository import PreparationTypeRepository
from back.test.support import AppTest, get_app


class _NoImage:
    available = True

    def generate(self, contents: list[Any]) -> None:
        return None


class ThingDto(ResponseDto):
    id: int


class ThingQuery(RequestDto):
    limit: int = 10


class ThingBody(RequestDto):
    name: str


class ThingApi(BaseApi):
    url_prefix = "/things"

    @BaseApi.endpoint("/<int:thing_id>", ["GET"], response=ThingDto)
    def get_thing(self, thing_id: int):
        pass

    @BaseApi.endpoint("/<int:thing_id>/declared", ["GET"], response=ThingDto, errors=(404, 409))
    def get_declared(self, thing_id: int):
        pass

    @BaseApi.endpoint("", ["GET"], query=ThingQuery, response=list[ThingDto])
    def list_things(self, query):
        pass

    @BaseApi.endpoint("", ["POST"], body=ThingBody, response=ThingDto, errors=(400,))
    def create_thing(self, body):
        pass

    @BaseApi.endpoint("/secure", ["DELETE"], status=204, errors=(404,))
    @require_auth
    def delete_secure(self):
        pass

    @BaseApi.endpoint("/secure", ["GET"], response=ThingDto, errors=(401,))
    @require_auth
    def get_secure(self):
        pass

    @BaseApi.endpoint("/lookup/<string:token>", ["GET"], response=ThingDto, errors=(400,))
    def lookup(self, token: str):
        pass


class ErrorStatusRulesTest(unittest.TestCase):
    spec: dict[str, Any]

    @classmethod
    def setUpClass(cls):
        app = Flask(__name__)
        app.register_blueprint(init_api_rules([ThingApi], db.session))
        cls.spec = build_openapi(app)

    def statuses(self, path: str, method: str) -> list:
        return sorted(self.spec["paths"][path][method]["responses"])

    def test_a_path_parameter_alone_implies_no_404(self):
        self.assertEqual(self.statuses("/things/{thing_id}", "get"), ["200"])

    def test_declared_statuses_are_listed(self):
        self.assertEqual(self.statuses("/things/{thing_id}/declared", "get"), ["200", "404", "409"])
        self.assertEqual(self.statuses("/things/lookup/{token}", "get"), ["200", "400"])
        self.assertEqual(
            self.spec["paths"]["/things/{thing_id}/declared"]["get"]["responses"]["409"],
            {
                "description": "Conflict",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponseDto"}}},
            },
        )

    def test_request_dtos_imply_400(self):
        self.assertEqual(self.statuses("/things", "get"), ["200", "400"])
        self.assertEqual(self.statuses("/things", "post"), ["200", "400"])

    def test_the_auth_guard_implies_401(self):
        self.assertEqual(self.statuses("/things/secure", "delete"), ["204", "401", "404"])
        self.assertEqual(self.statuses("/things/secure", "get"), ["200", "401"])

    def test_only_error_statuses_may_be_declared_once_each(self):
        args: dict[str, Any] = {"query": None, "body": None, "response": ThingDto, "status": 200, "operation_id": None}
        invalid: tuple[tuple[Any, ...], ...] = ((200,), (302,), (99,), (600,), (404, 404), ("404",), (404.0,))
        for errors in invalid:
            with self.subTest(errors=errors), self.assertRaises(ValueError):
                TypedEndpoint.declare(["GET"], **args, errors=errors)

        self.assertEqual(TypedEndpoint.declare(["GET"], **args, errors=[409, 404]).errors, (404, 409))


class DeclaredErrorsMatchHandlersTest(AppTest):
    """Each listed endpoint answers every error status its spec declares, and no other."""

    declared: dict[str, set[int]]

    @classmethod
    def setUpClass(cls):
        spec = build_openapi(get_app())
        cls.declared = {
            operation["operationId"]: {int(s) for s in operation["responses"] if int(s) >= 400}
            for methods in spec["paths"].values()
            for operation in methods.values()
        }

    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.ben = self.make_user("ben")
        self.root = self.make_user("root", is_admin=True)
        self.session = self.make_session("s1", creator=self.ana)
        self.potato = self.make_ingredient(self.session, "Potato")

    def assert_answers(self, operation_id: str, *responses):
        self.assertEqual({r.status_code for r in responses}, self.declared[operation_id], operation_id)

    def test_lookup_invite(self):
        self.assert_answers("lookupInvite", *[self.call("GET", "/auth/invite/nope") for _ in range(6)])

    def test_register(self):
        body = {"token": "nope", "email": "eve@example.com", "name": "eve", "password": "longenough"}
        self.assert_answers(
            "register",
            self.call("POST", "/auth/register", body={}),
            *[self.call("POST", "/auth/register", body=body) for _ in range(6)],
        )

    def test_login(self):
        self.assert_answers(
            "login",
            self.call("POST", "/auth/login", body={}),
            *[self.call("POST", "/auth/login", body={"name_or_email": "ana", "password": "wrong"}) for _ in range(6)],
        )

    def test_change_password(self):
        self.assert_answers(
            "changePassword",
            self.call("POST", "/auth/password", body={"current_password": "x", "new_password": "longenough"}),
            self.call("POST", "/auth/password", self.ana, body={"current_password": "x", "new_password": "short"}),
        )

    def test_update_me(self):
        self.assert_answers(
            "updateMe",
            self.call("PATCH", "/auth/me", body={"name": "x"}),
            self.call("PATCH", "/auth/me", self.ana, body={}),
            self.call("PATCH", "/auth/me", self.ana, body={"name": "ben"}),
        )

    def test_revoke_invite(self):
        used = self.make_invite(self.ana, "c@example.com", used=True)
        self.assert_answers(
            "revokeInvite",
            self.call("DELETE", f"/invites/{used.id}"),
            self.call("DELETE", "/invites/999", self.ana),
            self.call("DELETE", f"/invites/{used.id}", self.ana),
        )

    def test_roll_pan(self):
        self.assert_answers(
            "rollPan",
            self.call("POST", "/pans/generate", body={}, query={"session_key": "s1"}),
            self.call(
                "POST", "/pans/generate", self.ana, body={"num_fill": 0, "num_sauce": 0}, query={"session_key": "s1"}
            ),
            self.call("POST", "/pans/generate", self.ana, body={}, query={"session_key": "nope"}),
        )

    def test_delete_pan(self):
        rated = self.make_pan(self.ana, self.session, [self.potato])
        db.session.add(Rating(rating=4, user_id=self.ben.id, pan_id=rated.id, session_id=self.session.id))
        db.session.commit()
        self.assert_answers(
            "deletePan",
            self.call("DELETE", f"/pans/{rated.id}"),
            self.call("DELETE", "/pans/999", self.ana),
            self.call("DELETE", f"/pans/{rated.id}", self.ben),
            # Deleting a rated pan would orphan its ratings.
            self.call("DELETE", f"/pans/{rated.id}", self.ana),
        )

    def test_close_session(self):
        self.assert_answers(
            "closeSession",
            self.call("POST", "/sessions/close", body={"key": "s1"}),
            self.call("POST", "/sessions/close", self.ana, body={}),
            self.call("POST", "/sessions/close", self.ana, body={"key": "nope"}),
            self.call("POST", "/sessions/close", self.ben, body={"key": "s1"}),
        )

    def test_available_counts_of_an_unknown_session_are_zero_not_404(self):
        self.assert_answers(
            "getAvailableCounts",
            self.call("GET", "/ingredients/available-counts"),
            self.call("GET", "/ingredients/available-counts", self.ana),
        )
        unknown = self.call("GET", "/ingredients/available-counts", self.ana, query={"session_key": "nope"})
        self.assertEqual(unknown.status_code, 200)

    def test_delete_ingredient(self):
        self.make_session("s2")
        self.assert_answers(
            "deleteIngredient",
            self.call("DELETE", f"/ingredients/{self.potato.id}"),
            self.call("DELETE", f"/ingredients/{self.potato.id}", self.ana, query={"session_key": "s2"}),
            self.call("DELETE", "/ingredients/999", self.ana),
        )

    def test_reimport_ingredients(self):
        query = {"session_key": "s1"}
        self.assert_answers(
            "reimportIngredients",
            self.call("POST", "/ingredients/reimport", body={"ingredients": []}, query=query),
            self.call("POST", "/ingredients/reimport", self.ana, body={}, query=query),
            self.call("POST", "/ingredients/reimport", self.ana, body={"ingredients": []}, query={"session_key": "x"}),
            self.call(
                "POST",
                "/ingredients/reimport",
                self.ana,
                query=query,
                body={"ingredients": [{"id": 999, "name": "x", "type": 1, "vegan": True}]},
            ),
        )

    def test_delete_preparation_type(self):
        default = PreparationTypeRepository().defaults()[0]
        own = PreparationType(name="Grilled", session_id=self.session.id)
        db.session.add(own)
        db.session.commit()
        self.assert_answers(
            "deletePreparationType",
            self.call("DELETE", f"/preparation_type/{own.id}"),
            self.call("DELETE", f"/preparation_type/{default.id}", self.ana),
            self.call("DELETE", "/preparation_type/999", self.ana),
        )

    def test_list_events(self):
        self.assert_answers(
            "listEvents",
            self.call("GET", "/events", query={"session_key": "s1"}),
            self.call("GET", "/events", self.ana),
            self.call("GET", "/events", self.ana, query={"session_key": "nope"}),
        )

    def test_save_event_config(self):
        self.assert_answers(
            "saveEventConfig",
            self.call("POST", "/events/configs", body={"event_type": "pan_swap", "enabled": True}),
            self.call("POST", "/events/configs", self.root, body={"event_type": "rain", "enabled": True}),
            self.call("POST", "/events/configs", self.ana, body={"event_type": "pan_swap", "enabled": True}),
            self.call(
                "POST",
                "/events/configs",
                self.ana,
                body={"event_type": "pan_swap", "enabled": True, "session_key": "nope"},
            ),
        )

    def test_generate_profile_picture(self):
        previous = set_image_generator(GeminiImageGenerator(api_key=None))
        try:
            unavailable = self.call("POST", "/images/generate-profile-picture", self.ana, body={})
            set_image_generator(_NoImage())
            self.assert_answers(
                "generateProfilePicture",
                self.call("POST", "/images/generate-profile-picture", body={}),
                self.call("POST", "/images/generate-profile-picture", self.ana, body={"level_id": "first"}),
                unavailable,
                self.call("POST", "/images/generate-profile-picture", self.ana, body={}),
            )
        finally:
            set_image_generator(previous)

    def test_set_candidate_picture(self):
        picture = ProfilePictureHistory(user_id=self.ben.id, profile_picture="/static/ben.png")
        db.session.add(picture)
        db.session.commit()
        self.assert_answers(
            "setCandidatePicture",
            self.call("POST", f"/images/set-candidate-picture/{picture.id}"),
            self.call("POST", f"/images/set-candidate-picture/{picture.id}", self.ana),
            self.call("POST", "/images/set-candidate-picture/999", self.ana),
        )

    def test_stats(self):
        self.assert_answers(
            "getStats",
            self.call("GET", "/stats"),
            self.call("GET", "/stats", self.ana, query={"session_key": ""}),
        )
