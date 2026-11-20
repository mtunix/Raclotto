import time

import jwt

from back.src.auth.password import hash_password
from back.src.driver.database import db
from back.src.dto.auth import AuthResultDto, JoinLookupDto, JoinResultDto, TokenDto
from back.src.dto.user import MeDto
from back.src.entity.invite_token import InviteToken
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.user import User, user_sessions
from back.src.repository.level_repository import LevelRepository
from back.test.support import AppTest

PASSWORD = "secret"


class AuthTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", experience_points=120)
        self.ana.email = "ana@example.com"
        self.ana.password = hash_password(PASSWORD)
        db.session.commit()
        self.levels = LevelRepository().all_ordered()

    def pointers(self, response, status: int = 400) -> list:
        self.assertEqual(response.status_code, status, response.json)
        return [error["source"]["pointer"] for error in response.json["errors"]]

    def stored(self, user_id: int) -> User:
        db.session.expire_all()
        return db.session.get_one(User, user_id)

    def me_with(self, token: str):
        return self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})


class TestLogin(AuthTest):
    def login(self, name_or_email: str, password: str = PASSWORD):
        return self.call("POST", "/auth/login", body={"name_or_email": name_or_email, "password": password})

    def test_login_by_name_returns_a_token_and_the_user(self):
        response = self.login("ana")

        self.assertEqual(response.status_code, 200, response.json)
        result = AuthResultDto.model_validate(response.json)
        self.assertEqual(set(response.json["user"]), set(MeDto.model_fields))
        self.assertEqual((result.user.id, result.user.name, result.user.email), (self.ana.id, "ana", "ana@example.com"))
        self.assertEqual(self.me_with(result.token).json["id"], self.ana.id)

    def test_login_by_email(self):
        response = self.login("ana@example.com")

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json["user"]["id"], self.ana.id)

    def test_bad_credentials_are_401(self):
        for name_or_email, password in (("ana", "wrong"), ("nobody", PASSWORD)):
            with self.subTest(name_or_email=name_or_email):
                response = self.login(name_or_email, password)

                self.assertEqual(response.status_code, 401, response.json)
                [error] = response.json["errors"]
                self.assertEqual(
                    (error["code"], error["title"]), ("api_error_code.invalid_token", "Invalid credentials")
                )

    def test_an_unknown_account_takes_as_long_as_a_wrong_password(self):
        def fastest(name_or_email: str) -> float:
            timings = []
            for _ in range(3):
                start = time.perf_counter()
                self.assertEqual(self.login(name_or_email, "wrong").status_code, 401)
                timings.append(time.perf_counter() - start)
            return min(timings)

        self.assertGreater(fastest("nobody"), fastest("ana") / 2)

    def test_login_body_is_validated(self):
        self.assertEqual(self.pointers(self.login("ana", "")), ["/body/password"])
        legacy = self.call("POST", "/auth/login", body={"email": "ana", "password": PASSWORD})
        self.assertEqual(sorted(self.pointers(legacy)), ["/body/email", "/body/name_or_email"])

    def login_from(self, address: str, name_or_email: str, password: str = PASSWORD):
        return self.client.post(
            "/api/auth/login",
            json={"name_or_email": name_or_email, "password": password},
            environ_base={"REMOTE_ADDR": address},
        )

    def test_five_failures_pause_the_account_from_that_address(self):
        statuses = [self.login_from("10.0.0.1", "ana", "wrong").status_code for _ in range(5)]

        paused = self.login_from("10.0.0.1", "ANA")

        self.assertEqual(statuses, [401] * 5)
        self.assertEqual(paused.status_code, 429, paused.json)
        self.assertEqual(paused.json["errors"][0]["title"], "Too many attempts")
        self.assertEqual(self.login_from("10.0.0.2", "ana").status_code, 200)
        self.assertEqual(self.login_from("10.0.0.1", "ana@example.com").status_code, 200)

    def test_a_successful_login_forgets_the_failures(self):
        for _ in range(4):
            self.login_from("10.0.0.1", "ana", "wrong")
        self.assertEqual(self.login_from("10.0.0.1", "ana").status_code, 200)

        statuses = [self.login_from("10.0.0.1", "ana", "wrong").status_code for _ in range(4)]

        self.assertEqual(statuses, [401] * 4)
        self.assertEqual(self.login_from("10.0.0.1", "ana").status_code, 200)


class TestMe(AuthTest):
    def test_me_is_the_signed_in_user(self):
        db.session.add(ProfilePictureHistory(user_id=self.ana.id, profile_picture="/pics/ana.png"))
        db.session.commit()

        response = self.call("GET", "/auth/me", self.ana)

        self.assertEqual(response.status_code, 200, response.json)
        me = MeDto.model_validate(response.json)
        self.assertEqual(set(response.json), set(MeDto.model_fields))
        self.assertEqual(
            (me.id, me.email, me.profile_picture, me.language), (self.ana.id, "ana@example.com", "/pics/ana.png", "de")
        )
        self.assertEqual((me.meat, me.vegetarian, me.vegan, me.fish), (False, True, True, False))
        self.assertEqual(me.experience_points, 120)
        assert me.level is not None and me.next_level is not None
        self.assertEqual((me.level.id, me.next_level.id), (self.levels[1].id, self.levels[2].id))

    def test_me_requires_a_token(self):
        self.assertEqual(self.call("GET", "/auth/me").status_code, 401)

    def test_highest_level_has_no_next_level(self):
        top = self.make_user("top", experience_points=self.levels[-1].required_experience)

        me = MeDto.model_validate(self.call("GET", "/auth/me", top).json)

        assert me.level is not None
        self.assertEqual((me.level.id, me.next_level), (self.levels[-1].id, None))

    def test_a_user_without_level_is_shown_the_level_their_xp_reaches_without_writing_it(self):
        for xp, expected in ((0, self.levels[0]), (self.levels[2].required_experience, self.levels[2])):
            with self.subTest(xp=xp):
                user = self.make_user(f"old-{xp}", experience_points=xp)
                user.level_id = None
                db.session.commit()

                with self.recorded_writes() as writes:
                    me = self.call("GET", "/auth/me", user).json
                    profile = self.call("GET", f"/users/{user.id}", self.ana).json

                self.assertEqual((me["level"]["id"], profile["level"]["id"]), (expected.id, expected.id))
                self.assertEqual(me["next_level"], profile["next_level"])
                self.assertEqual(writes, [])
                self.assertIsNone(self.stored(user.id).level_id)

    def test_unknown_stored_language_falls_back_to_the_default(self):
        self.ana.language = "fr"
        db.session.commit()

        self.assertEqual(self.call("GET", "/auth/me", self.ana).json["language"], "de")


class TestUpdateMe(AuthTest):
    def update(self, body: dict, user=None):
        return self.call("PATCH", "/auth/me", self.ana if user is None else user, body=body)

    def test_update_returns_the_whole_user(self):
        response = self.update({"name": "ana b", "color": "#123456", "language": "en", "glow_effect": True})

        self.assertEqual(response.status_code, 200, response.json)
        me = MeDto.model_validate(response.json)
        self.assertEqual((me.name, me.color, me.language, me.glow_effect), ("ana b", "#123456", "en", True))
        assert me.level is not None
        self.assertEqual(me.level.id, self.levels[1].id)
        stored = self.stored(self.ana.id)
        self.assertEqual(
            (stored.name, stored.color, stored.language, stored.glow_effect), ("ana b", "#123456", "en", True)
        )

    def test_omitted_fields_stay(self):
        self.update({"border_style": "dotted"})

        stored = self.stored(self.ana.id)
        self.assertEqual((stored.name, stored.border_style, stored.language), ("ana", "dotted", "de"))

    def test_diet_is_normalized(self):
        cases = (
            ({"meat": True, "vegetarian": False, "vegan": False}, (True, True, True)),
            ({"meat": False, "vegetarian": True, "vegan": False}, (False, True, True)),
            ({"meat": False, "vegetarian": False, "vegan": False}, (False, True, True)),
            ({"meat": False, "vegetarian": False, "vegan": True}, (False, False, True)),
        )
        for diet, expected in cases:
            with self.subTest(diet=diet):
                me = self.update(diet).json

                self.assertEqual((me["meat"], me["vegetarian"], me["vegan"]), expected)
                stored = self.stored(self.ana.id)
                self.assertEqual((stored.meat, stored.vegetarian, stored.vegan), expected)

    def test_border_style_texture_and_language_must_be_offered(self):
        self.assertEqual(self.pointers(self.update({"border_style": "ridge"})), ["/body/border_style"])
        self.assertEqual(self.pointers(self.update({"border_texture": "crispy"})), ["/body/border_texture"])
        self.assertEqual(self.pointers(self.update({"language": "fr"})), ["/body/language"])
        self.assertEqual(self.pointers(self.update({"border_style": None})), ["/body/border_style"])

        self.update({"border_texture": "cheese"})
        self.assertEqual(self.update({"border_texture": None}).json["border_texture"], None)
        self.assertIsNone(self.stored(self.ana.id).border_texture)

    def test_body_must_change_something_known(self):
        self.assertEqual(self.pointers(self.update({})), ["/body"])
        self.assertEqual(self.pointers(self.update({"password": "new"})), ["/body/password"])
        self.assertEqual(self.pointers(self.update({"name": ""})), ["/body/name"])
        self.assertEqual(self.pointers(self.update({"name": None})), ["/body/name"])

    def test_an_invalid_body_without_token_is_401(self):
        self.assertEqual(self.call("PATCH", "/auth/me", body={"border_style": "ridge"}).status_code, 401)

    def test_profile_picture_is_set_and_removed_through_the_history(self):
        set_ = self.update({"profile_picture": "/pics/new.png"}).json
        removed = self.update({"profile_picture": None}).json

        self.assertEqual((set_["profile_picture"], removed["profile_picture"]), ("/pics/new.png", None))
        history = db.session.query(ProfilePictureHistory).filter_by(user_id=self.ana.id).all()
        self.assertEqual(sorted(h.profile_picture or "" for h in history), ["", "/pics/new.png"])
        self.assertEqual({h.level_id for h in history}, {self.levels[1].id})

    def test_a_rejected_update_writes_no_picture(self):
        response = self.update({"profile_picture": "/pics/new.png", "border_style": "ridge"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(db.session.query(ProfilePictureHistory).count(), 0)

    def test_a_taken_name_changes_nothing(self):
        self.make_user("ben")

        response = self.update({"name": "ben", "profile_picture": "/pics/new.png", "color": "#000000"})

        self.assertEqual(response.status_code, 409, response.json)
        [error] = response.json["errors"]
        # The database's message (table, column, statement) stays out of the response.
        self.assertEqual(
            (error["code"], error["detail"]), ("api_error_code.conflict", "The change conflicts with existing data")
        )
        stored = self.stored(self.ana.id)
        self.assertEqual((stored.name, stored.color), ("ana", None))
        self.assertEqual(db.session.query(ProfilePictureHistory).count(), 0)


class TestChangePassword(AuthTest):
    def login(self, password: str):
        return self.call("POST", "/auth/login", body={"name_or_email": "ana", "password": password})

    def change(self, current: str, new: str, user: User | None = None):
        return self.call(
            "POST", "/auth/password", user or self.ana, body={"current_password": current, "new_password": new}
        )

    def test_the_new_password_signs_in_and_other_devices_are_signed_out(self):
        other_device = self.login(PASSWORD).json

        response = self.change(PASSWORD, "much-longer")

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(self.me_with(TokenDto.model_validate(response.json).token).status_code, 200)
        self.assertEqual(self.me_with(other_device["token"]).status_code, 401)
        self.assertEqual((self.login(PASSWORD).status_code, self.login("much-longer").status_code), (401, 200))

    def test_a_wrong_current_password_changes_nothing(self):
        before = self.stored(self.ana.id)
        password, version = before.password, before.token_version

        response = self.change("wrong", "much-longer")

        self.assertEqual(response.status_code, 400, response.json)
        self.assertEqual(response.json["errors"][0]["title"], "Wrong password")
        after = self.stored(self.ana.id)
        self.assertEqual((after.password, after.token_version), (password, version))

    def test_the_new_password_needs_eight_characters(self):
        self.assertEqual(self.pointers(self.change(PASSWORD, "short")), ["/body/new_password"])

    def test_tokens_without_a_version_count_as_the_first(self):
        legacy = jwt.encode({"user_id": self.ana.id, "exp": 4102444800}, self.app.config["JWT_SECRET_KEY"])

        self.assertEqual(self.me_with(legacy).status_code, 200)
        self.change(PASSWORD, "much-longer")
        self.assertEqual(self.me_with(legacy).status_code, 401)


class TestRefresh(AuthTest):
    def test_refresh_issues_a_working_token(self):
        response = self.call("POST", "/auth/refresh", self.ana)

        self.assertEqual(response.status_code, 200, response.json)
        token = TokenDto.model_validate(response.json).token
        self.assertEqual(self.me_with(token).json["id"], self.ana.id)

    def test_refresh_requires_a_token(self):
        self.assertEqual(self.call("POST", "/auth/refresh").status_code, 401)


class TestRegister(AuthTest):
    def register(self, invite: InviteToken, **overrides):
        body = {"token": invite.token, "email": "ben@example.com", "name": "ben", "password": "pw-12345", **overrides}
        return self.call("POST", "/auth/register", body=body)

    def error_title(self, response) -> str:
        self.assertEqual(response.status_code, 400, response.json)
        [error] = response.json["errors"]
        return error["title"]

    def test_register_signs_the_new_user_in(self):
        invite = self.make_invite(self.ana)

        response = self.register(invite, email="Ben@Example.com", profile_picture="/pics/ben.png")

        self.assertEqual(response.status_code, 200, response.json)
        result = AuthResultDto.model_validate(response.json)
        ben = self.stored(result.user.id)
        self.assertEqual(
            (ben.name, ben.email, ben.experience_points, ben.level_id), ("ben", "Ben@Example.com", 0, self.levels[0].id)
        )
        self.assertEqual((result.user.name, result.user.profile_picture), ("ben", "/pics/ben.png"))
        assert result.user.level is not None and result.user.next_level is not None
        self.assertEqual((result.user.level.id, result.user.next_level.id), (self.levels[0].id, self.levels[1].id))
        self.assertTrue(db.session.get_one(InviteToken, invite.id).is_used)
        self.assertEqual(self.me_with(result.token).json["id"], ben.id)
        self.assertEqual(
            self.call("POST", "/auth/login", body={"name_or_email": "ben", "password": "pw-12345"}).status_code, 200
        )

    def test_the_first_picture_is_the_one_generation_starts_from(self):
        invite = self.make_invite(self.ana)
        result = AuthResultDto.model_validate(self.register(invite, profile_picture="/pics/ben.png").json)

        changed = self.call("PATCH", "/auth/me", self.stored(result.user.id), body={"profile_picture": "/pics/new.png"})

        self.assertEqual(changed.status_code, 200, changed.json)
        history = db.session.query(ProfilePictureHistory).filter_by(user_id=result.user.id)
        self.assertEqual(
            sorted((h.profile_picture, h.is_candidate) for h in history),
            [("/pics/ben.png", True), ("/pics/new.png", False)],
        )

    def test_unusable_invites_are_rejected(self):
        used = self.make_invite(self.ana, used=True)
        expired = self.make_invite(self.ana, expires_in_days=-1)

        self.assertEqual(self.error_title(self.register(used)), "Invalid invite token")
        self.assertEqual(self.error_title(self.register(expired)), "Invalid invite token")
        self.assertEqual(self.error_title(self.register(used, token="nope")), "Invalid invite token")
        self.assertEqual(db.session.query(User).filter_by(name="ben").count(), 0)

    def test_any_email_or_none_registers(self):
        response = self.register(self.make_invite(self.ana), email=None)

        self.assertEqual(response.status_code, 200, response.json)
        self.assertIsNone(self.stored(response.json["user"]["id"]).email)
        second = self.register(self.make_invite(self.ana), name="cleo", email="whoever@example.com")
        self.assertEqual(second.status_code, 200, second.json)

    def test_name_and_email_must_be_free(self):
        taken_email = self.make_invite(self.ana)
        free_email = self.make_invite(self.ana)

        self.assertEqual(self.error_title(self.register(taken_email, email="ana@example.com")), "User already exists")
        self.assertEqual(self.error_title(self.register(free_email, name="ana")), "User already exists")
        db.session.expire_all()
        self.assertFalse(db.session.get_one(InviteToken, free_email.id).is_used)

    def test_register_body_is_validated(self):
        invite = self.make_invite(self.ana)

        self.assertEqual(self.pointers(self.register(invite, password="")), ["/body/password"])
        self.assertEqual(self.pointers(self.register(invite, password="7 chars")), ["/body/password"])
        self.assertEqual(
            self.pointers(self.call("POST", "/auth/register", body={})),
            ["/body/token", "/body/name", "/body/password"],
        )


class TestInviteLookup(AuthTest):
    def test_lookup_shows_when_the_invite_expires(self):
        invite = self.make_invite(self.ana)

        response = self.call("GET", f"/auth/invite/{invite.token}")

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), {"expires_at"})

    def test_unusable_invites_are_400(self):
        used = self.make_invite(self.ana, used=True)
        expired = self.make_invite(self.ana, expires_in_days=-1)

        for token in (used.token, expired.token, "nope"):
            with self.subTest(token=token):
                response = self.call("GET", f"/auth/invite/{token}")
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual(response.json["errors"][0]["title"], "Invalid invite token")


class TestInviteGuessing(AuthTest):
    def lookup_from(self, address: str, token: str):
        return self.client.get(f"/api/auth/invite/{token}", environ_base={"REMOTE_ADDR": address})

    def register_from(self, address: str, token: str, email: str = "ben@example.com"):
        body = {"token": token, "email": email, "name": "ben", "password": "pw-12345"}
        return self.client.post("/api/auth/register", json=body, environ_base={"REMOTE_ADDR": address})

    def test_five_wrong_tokens_pause_lookup_and_registration_from_that_address(self):
        invite = self.make_invite(self.ana)
        statuses = [self.lookup_from("10.0.0.1", "nope").status_code for _ in range(3)]
        statuses += [self.register_from("10.0.0.1", "nope").status_code for _ in range(2)]

        lookup, register = self.lookup_from("10.0.0.1", invite.token), self.register_from("10.0.0.1", invite.token)

        self.assertEqual(statuses, [400] * 5)
        self.assertEqual((lookup.status_code, register.status_code), (429, 429), (lookup.json, register.json))
        self.assertEqual(register.json["errors"][0]["code"], "api_error_code.too_many_requests")
        self.assertEqual(self.lookup_from("10.0.0.2", invite.token).status_code, 200)

    def test_a_taken_name_is_not_a_guess(self):
        for _ in range(5):
            self.register_from("10.0.0.1", self.make_invite(self.ana).token, email="ana@example.com")

        self.assertEqual(self.register_from("10.0.0.1", self.make_invite(self.ana).token).status_code, 200)


class TestGuestJoin(AuthTest):
    def setUp(self):
        super().setUp()
        self.session = self.make_session("s1", creator=self.ana)

    def join(self, **overrides):
        return self.call("POST", "/auth/join", body={"join_code": self.session.join_code, "name": "ben", **overrides})

    def test_lookup_names_the_session(self):
        response = self.call("GET", f"/auth/join/{self.session.join_code}")

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(
            JoinLookupDto.model_validate(response.json),
            JoinLookupDto(session_id=self.session.id, session_name="s1", active=True),
        )
        self.assertEqual(self.call("GET", "/auth/join/nope").status_code, 400)

    def test_a_guest_joins_with_a_name_and_is_signed_in_as_a_member(self):
        response = self.join(profile_picture="/pics/ben.png")

        self.assertEqual(response.status_code, 200, response.json)
        result = JoinResultDto.model_validate(response.json)
        self.assertEqual((result.session.id, result.user.name, result.user.is_guest), (self.session.id, "ben", True))
        self.assertEqual(result.user.profile_picture, "/pics/ben.png")
        ben = self.stored(result.user.id)
        self.assertEqual((ben.password, ben.email, ben.level_id), (None, None, self.levels[0].id))
        members = db.session.query(user_sessions.c.user_id).filter_by(session_id=self.session.id).all()
        self.assertIn((ben.id,), members)
        self.assertEqual(self.me_with(result.token).json["is_guest"], True)

    def test_a_guest_cannot_sign_in_with_any_password(self):
        self.join()

        response = self.call("POST", "/auth/login", body={"name_or_email": "ben", "password": "x"})

        self.assertEqual(response.status_code, 401, response.json)

    def test_a_taken_name_unknown_code_or_closed_session_is_refused(self):
        self.assertEqual(self.join(name="ana").status_code, 400)
        self.assertEqual(self.join(join_code="nope").status_code, 400)
        self.session.active = False
        db.session.commit()
        closed = self.join()
        self.assertEqual(closed.status_code, 409, closed.json)
        self.assertEqual(db.session.query(User).filter_by(name="ben").count(), 0)

    def test_wrong_codes_pause_the_address(self):
        for _ in range(5):
            self.client.get("/api/auth/join/nope", environ_base={"REMOTE_ADDR": "10.0.0.1"})

        response = self.client.get(f"/api/auth/join/{self.session.join_code}", environ_base={"REMOTE_ADDR": "10.0.0.1"})

        self.assertEqual(response.status_code, 429, response.json)

    def test_a_guest_may_not_invite(self):
        guest = self.stored(JoinResultDto.model_validate(self.join().json).user.id)

        response = self.call("POST", "/invites", guest)

        self.assertEqual(response.status_code, 403, response.json)


class TestClaim(AuthTest):
    def guest(self) -> User:
        session = self.make_session("s1", creator=self.ana)
        joined = self.call("POST", "/auth/join", body={"join_code": session.join_code, "name": "ben"})
        return self.stored(joined.json["user"]["id"])

    def test_a_claimed_guest_signs_in_with_name_or_email(self):
        guest = self.guest()

        response = self.call("POST", "/auth/claim", guest, body={"password": "pw-12345", "email": "ben@example.com"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertFalse(MeDto.model_validate(response.json).is_guest)
        for name in ("ben", "ben@example.com"):
            signed_in = self.call("POST", "/auth/login", body={"name_or_email": name, "password": "pw-12345"})
            self.assertEqual(signed_in.status_code, 200, signed_in.json)

    def test_only_a_guest_claims_and_only_with_a_free_email(self):
        guest = self.guest()

        taken = self.call("POST", "/auth/claim", guest, body={"password": "pw-12345", "email": "ana@example.com"})
        not_a_guest = self.call("POST", "/auth/claim", self.ana, body={"password": "pw-12345"})
        short = self.call("POST", "/auth/claim", guest, body={"password": "short"})

        self.assertEqual(taken.status_code, 400, taken.json)
        self.assertEqual(not_a_guest.status_code, 409, not_a_guest.json)
        self.assertEqual(self.pointers(short), ["/body/password"])
        self.assertIsNone(self.stored(guest.id).password)
