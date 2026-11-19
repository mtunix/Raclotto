from back.src.auth.password import hash_password
from back.src.driver.database import db
from back.src.dto.auth import AuthResultDto, TokenDto
from back.src.dto.user import MeDto
from back.src.entity.invite_token import InviteToken
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.user import User
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
                self.assertEqual((error["code"], error["title"]), ("api_error_code.invalid_token", "Invalid credentials"))

    def test_login_body_is_validated(self):
        self.assertEqual(self.pointers(self.login("ana", "")), ["/body/password"])
        legacy = self.call("POST", "/auth/login", body={"email": "ana", "password": PASSWORD})
        self.assertEqual(sorted(self.pointers(legacy)), ["/body/email", "/body/name_or_email"])


class TestMe(AuthTest):
    def test_me_is_the_signed_in_user(self):
        db.session.add(ProfilePictureHistory(user_id=self.ana.id, profile_picture="/pics/ana.png"))
        db.session.commit()

        response = self.call("GET", "/auth/me", self.ana)

        self.assertEqual(response.status_code, 200, response.json)
        me = MeDto.model_validate(response.json)
        self.assertEqual(set(response.json), set(MeDto.model_fields))
        self.assertEqual((me.id, me.email, me.profile_picture, me.language), (self.ana.id, "ana@example.com", "/pics/ana.png", "de"))
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
        self.assertEqual((stored.name, stored.color, stored.language, stored.glow_effect), ("ana b", "#123456", "en", True))

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
        # The database's message (table, column, statement) stays out of the response.
        self.assertEqual(response.json["errors"][0]["detail"], "The change conflicts with existing data")
        stored = self.stored(self.ana.id)
        self.assertEqual((stored.name, stored.color), ("ana", None))
        self.assertEqual(db.session.query(ProfilePictureHistory).count(), 0)


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
        body = {"token": invite.token, "email": invite.email, "name": "ben", "password": "pw", **overrides}
        return self.call("POST", "/auth/register", body=body)

    def error_title(self, response) -> str:
        self.assertEqual(response.status_code, 400, response.json)
        [error] = response.json["errors"]
        return error["title"]

    def test_register_signs_the_new_user_in(self):
        invite = self.make_invite(self.ana, "ben@example.com")

        response = self.register(invite, email="Ben@Example.com", profile_picture="/pics/ben.png")

        self.assertEqual(response.status_code, 200, response.json)
        result = AuthResultDto.model_validate(response.json)
        ben = self.stored(result.user.id)
        self.assertEqual((ben.name, ben.email, ben.experience_points, ben.level_id), ("ben", "Ben@Example.com", 0, self.levels[0].id))
        self.assertEqual((result.user.name, result.user.profile_picture), ("ben", "/pics/ben.png"))
        assert result.user.level is not None and result.user.next_level is not None
        self.assertEqual((result.user.level.id, result.user.next_level.id), (self.levels[0].id, self.levels[1].id))
        self.assertTrue(db.session.get_one(InviteToken, invite.id).is_used)
        self.assertEqual(self.me_with(result.token).json["id"], ben.id)
        self.assertEqual(self.call("POST", "/auth/login", body={"name_or_email": "ben", "password": "pw"}).status_code, 200)

    def test_unusable_invites_are_rejected(self):
        used = self.make_invite(self.ana, "ben@example.com", used=True)
        expired = self.make_invite(self.ana, "ben@example.com", expires_in_days=-1)

        self.assertEqual(self.error_title(self.register(used)), "Invalid invite token")
        self.assertEqual(self.error_title(self.register(expired)), "Invalid invite token")
        self.assertEqual(self.error_title(self.register(used, token="nope")), "Invalid invite token")
        self.assertEqual(db.session.query(User).filter_by(name="ben").count(), 0)

    def test_email_must_match_the_invite(self):
        invite = self.make_invite(self.ana, "ben@example.com")

        self.assertEqual(self.error_title(self.register(invite, email="eve@example.com")), "Email mismatch")
        db.session.expire_all()
        self.assertFalse(db.session.get_one(InviteToken, invite.id).is_used)
        self.assertEqual(db.session.query(User).filter_by(name="ben").count(), 0)

    def test_name_and_email_must_be_free(self):
        taken_email = self.make_invite(self.ana, "ana@example.com")
        free_email = self.make_invite(self.ana, "ben@example.com")

        self.assertEqual(self.error_title(self.register(taken_email)), "User already exists")
        self.assertEqual(self.error_title(self.register(free_email, name="ana")), "User already exists")
        db.session.expire_all()
        self.assertFalse(db.session.get_one(InviteToken, free_email.id).is_used)

    def test_register_body_is_validated(self):
        invite = self.make_invite(self.ana, "ben@example.com")

        self.assertEqual(self.pointers(self.register(invite, password="")), ["/body/password"])
        self.assertEqual(self.pointers(self.call("POST", "/auth/register", body={})),
                         ["/body/token", "/body/email", "/body/name", "/body/password"])


class TestInviteLookup(AuthTest):
    def test_lookup_shows_the_invited_email(self):
        invite = self.make_invite(self.ana, "ben@example.com")

        response = self.call("GET", f"/auth/invite/{invite.token}")

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), {"email", "expires_at"})
        self.assertEqual(response.json["email"], "ben@example.com")

    def test_unusable_invites_are_400(self):
        used = self.make_invite(self.ana, "a@example.com", used=True)
        expired = self.make_invite(self.ana, "b@example.com", expires_in_days=-1)

        for token in (used.token, expired.token, "nope"):
            with self.subTest(token=token):
                response = self.call("GET", f"/auth/invite/{token}")
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual(response.json["errors"][0]["title"], "Invalid invite token")
