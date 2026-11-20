from datetime import datetime, timedelta

from back.src.driver.database import db
from back.src.dto.invite import InviteDto
from back.src.entity.invite_token import InviteToken
from back.test.support import AppTest


class TestInviteApi(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")

    def stored(self) -> list:
        db.session.expire_all()
        return [(i.created_by_user_id, i.is_used) for i in db.session.query(InviteToken).order_by(InviteToken.id)]

    def test_any_signed_in_user_creates_invites(self):
        response = self.call("POST", "/invites", self.ben)

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), set(InviteDto.model_fields))
        invite = InviteDto.model_validate(response.json)
        self.assertEqual((invite.is_used, invite.used_at), (False, None))
        self.assertTrue(invite.token)
        self.assertAlmostEqual(invite.expires_at, datetime.now() + timedelta(days=7), delta=timedelta(minutes=1))
        self.assertEqual(self.stored(), [(self.ben.id, False)])

    def test_create_requires_a_token(self):
        self.assertEqual(self.call("POST", "/invites").status_code, 401)
        self.assertEqual(self.stored(), [])

    def test_list_shows_only_own_invites_newest_first(self):
        older = self.make_invite(self.ana)
        older.created_at = datetime.now() - timedelta(days=1)
        db.session.commit()
        newer = self.make_invite(self.ana, used=True)
        self.make_invite(self.ben)

        response = self.call("GET", "/invites", self.ana)

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual([i["id"] for i in response.json], [newer.id, older.id])
        self.assertEqual([i["token"] for i in response.json], [newer.token, older.token])
        self.assertEqual(self.call("GET", "/invites").status_code, 401)

    def test_revoke_deletes_an_unused_own_invite(self):
        invite = self.make_invite(self.ana)

        response = self.call("DELETE", f"/invites/{invite.id}", self.ana)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.get_data(), b"")
        self.assertEqual(self.stored(), [])

    def test_revoking_an_unknown_invite_is_404_a_used_one_400(self):
        used = self.make_invite(self.ana, used=True)

        unknown, spent = (
            self.call("DELETE", "/invites/999", self.ana),
            self.call("DELETE", f"/invites/{used.id}", self.ana),
        )

        self.assertEqual(
            [(r.status_code, r.json["errors"][0]["code"]) for r in (unknown, spent)],
            [(404, "api_error_code.resource_not_found"), (400, "api_error_code.incorrect_parameters")],
        )
        self.assertEqual(self.call("DELETE", f"/invites/{used.id}").status_code, 401)
