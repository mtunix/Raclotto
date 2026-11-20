import time
from datetime import datetime, timedelta

from back.src.auth.password import verify_password
from back.src.driver.database import db
from back.src.entity.invite_token import InviteToken
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.user import User, user_sessions
from back.src.interactor.accounts import AccountError, Accounts
from back.src.repository.level_repository import LevelRepository
from back.test.support import AppTest


class AccountsTest(AppTest):
    def setUp(self):
        super().setUp()
        self.accounts = Accounts()
        self.levels = LevelRepository().all_ordered()
        self.ana = self.accounts.create_user("ana", "ana@example.com", "correct horse")

    def refused(self, kind: str, call, *args) -> None:
        with self.assertRaises(AccountError) as raised:
            call(*args)
        self.assertEqual(raised.exception.kind, kind)

    def users_named(self, name: str) -> int:
        return db.session.query(User).filter_by(name=name).count()

    def history(self, user: User) -> list[ProfilePictureHistory]:
        return db.session.query(ProfilePictureHistory).filter_by(user_id=user.id).all()


class SignInTest(AccountsTest):
    def test_by_name_or_email(self):
        self.assertEqual(self.accounts.sign_in("ana", "correct horse"), self.ana)
        self.assertEqual(self.accounts.sign_in("ana@example.com", "correct horse"), self.ana)

    def test_a_wrong_password_and_an_unknown_account_are_refused_alike(self):
        for name, password in (("ana", "wrong"), ("nobody", "correct horse")):
            with self.subTest(name=name):
                self.refused(AccountError.BAD_CREDENTIALS, self.accounts.sign_in, name, password)

    def test_an_unknown_account_takes_as_long_as_a_wrong_password(self):
        def fastest(name: str) -> float:
            timings = []
            for _ in range(3):
                start = time.perf_counter()
                self.refused(AccountError.BAD_CREDENTIALS, self.accounts.sign_in, name, "wrong")
                timings.append(time.perf_counter() - start)
            return min(timings)

        self.assertGreater(fastest("nobody"), fastest("ana") / 2)


class InviteTest(AccountsTest):
    def test_an_invite_is_usable_until_it_expires(self):
        invite = self.accounts.invite(self.ana, valid_days=3)

        self.assertEqual((invite.created_by_user_id, invite.is_used, invite.used_at), (self.ana.id, False, None))
        self.assertTrue(invite.token)
        self.assertAlmostEqual(invite.expires_at, datetime.now() + timedelta(days=3), delta=timedelta(minutes=1))
        self.assertEqual(self.accounts.usable_invite(invite.token), invite)

    def test_a_used_or_expired_invite_is_spent_and_an_unknown_one_unknown(self):
        used = self.make_invite(self.ana, used=True)
        expired = self.make_invite(self.ana, expires_in_days=-1)

        self.refused(AccountError.SPENT_INVITE, self.accounts.usable_invite, used.token)
        self.refused(AccountError.SPENT_INVITE, self.accounts.usable_invite, expired.token)
        self.refused(AccountError.UNKNOWN_INVITE, self.accounts.usable_invite, "nope")


class RegisterTest(AccountsTest):
    def test_registering_uses_the_invite_and_starts_at_the_lowest_level(self):
        invite = self.make_invite(self.ana)

        ben = self.accounts.register(invite.token, "ben", "Ben@Example.com", "pw-12345", None)

        self.assertEqual(
            (ben.name, ben.email, ben.experience_points, ben.level_id, ben.is_admin),
            ("ben", "Ben@Example.com", 0, self.levels[0].id, False),
        )
        self.assertTrue(invite.is_used)
        self.assertIsNotNone(invite.used_at)
        self.assertEqual(self.accounts.sign_in("ben", "pw-12345"), ben)
        self.refused(AccountError.SPENT_INVITE, self.accounts.register, invite.token, "cleo", None, "pw-12345", None)

    def test_any_email_or_none_registers(self):
        without = self.accounts.register(self.make_invite(self.ana).token, "ben", None, "pw-12345", None)
        empty = self.accounts.register(self.make_invite(self.ana).token, "cleo", "", "pw-12345", None)
        other = self.accounts.register(self.make_invite(self.ana).token, "dan", "whoever@example.com", "pw-12345", None)

        self.assertEqual((without.email, empty.email, other.email), (None, None, "whoever@example.com"))

    def test_the_first_picture_is_the_one_generation_starts_from(self):
        ben = self.accounts.register(self.make_invite(self.ana).token, "ben", None, "pw-12345", "/pics/ben.png")

        self.accounts.update_profile(ben, {"profile_picture": "/pics/new.png"})

        self.assertEqual(
            sorted((h.profile_picture, h.is_candidate) for h in self.history(ben)),
            [("/pics/ben.png", True), ("/pics/new.png", False)],
        )

    def test_without_a_picture_none_is_recorded(self):
        ben = self.accounts.register(self.make_invite(self.ana).token, "ben", None, "pw-12345", None)

        self.assertEqual(self.history(ben), [])

    def test_a_taken_name_or_email_leaves_the_invite_unused(self):
        invite = self.make_invite(self.ana)

        self.refused(AccountError.TAKEN, self.accounts.register, invite.token, "ben", "ana@example.com", "pw", None)
        self.refused(AccountError.TAKEN, self.accounts.register, invite.token, "ana", "ben@example.com", "pw", None)

        self.assertFalse(invite.is_used)
        self.assertEqual(self.users_named("ben"), 0)

    def test_an_unusable_invite_registers_no_one(self):
        for token in (self.make_invite(self.ana, used=True).token, self.make_invite(self.ana, -1).token, "nope"):
            with self.subTest(token=token), self.assertRaises(AccountError):
                self.accounts.register(token, "ben", None, "pw-12345", None)

        self.assertEqual(self.users_named("ben"), 0)


class GuestJoinTest(AccountsTest):
    def setUp(self):
        super().setUp()
        self.session = self.make_session("s1", creator=self.ana)

    def test_a_guest_is_a_member_without_password_or_email(self):
        ben, session = self.accounts.join_as_guest(self.session.join_code, "ben", "/pics/ben.png")

        self.assertEqual(session, self.session)
        self.assertEqual((ben.password, ben.email, ben.level_id), (None, None, self.levels[0].id))
        members = db.session.query(user_sessions.c.user_id).filter_by(session_id=self.session.id).all()
        self.assertIn((ben.id,), members)
        self.assertEqual([h.profile_picture for h in self.history(ben)], ["/pics/ben.png"])

    def test_a_guest_cannot_sign_in_with_any_password(self):
        self.accounts.join_as_guest(self.session.join_code, "ben", None)

        for password in ("x", ""):
            with self.subTest(password=password):
                self.refused(AccountError.BAD_CREDENTIALS, self.accounts.sign_in, "ben", password)

    def test_a_closed_session_still_opens_but_takes_no_guests(self):
        self.session.active = False
        db.session.flush()

        self.assertEqual(self.accounts.joinable_session(self.session.join_code), self.session)
        self.refused(AccountError.CLOSED_SESSION, self.accounts.join_as_guest, self.session.join_code, "ben", None)
        self.assertEqual(self.users_named("ben"), 0)

    def test_an_unknown_code_and_a_taken_name_are_refused(self):
        self.refused(AccountError.UNKNOWN_JOIN_CODE, self.accounts.joinable_session, "nope")
        self.refused(AccountError.UNKNOWN_JOIN_CODE, self.accounts.join_as_guest, "nope", "ben", None)
        self.refused(AccountError.TAKEN, self.accounts.join_as_guest, self.session.join_code, "ana", None)

        self.assertEqual(self.users_named("ben"), 0)


class ClaimTest(AccountsTest):
    def setUp(self):
        super().setUp()
        self.guest, _ = self.accounts.join_as_guest(self.make_session("s1", creator=self.ana).join_code, "ben", None)

    def test_a_claimed_guest_signs_in_with_name_or_email(self):
        self.accounts.claim(self.guest, "pw-12345", "ben@example.com")

        self.assertEqual(self.guest.email, "ben@example.com")
        for name in ("ben", "ben@example.com"):
            self.assertEqual(self.accounts.sign_in(name, "pw-12345"), self.guest)

    def test_a_claim_without_an_email_keeps_none(self):
        self.accounts.claim(self.guest, "pw-12345", "")

        self.assertIsNone(self.guest.email)
        self.assertEqual(self.accounts.sign_in("ben", "pw-12345"), self.guest)

    def test_only_a_guest_claims_and_only_with_a_free_email(self):
        self.refused(AccountError.TAKEN, self.accounts.claim, self.guest, "pw-12345", "ana@example.com")
        self.refused(AccountError.NOT_A_GUEST, self.accounts.claim, self.ana, "pw-12345", None)

        self.assertEqual((self.guest.password, self.guest.email), (None, None))
        self.assertTrue(verify_password("correct horse", self.ana.password))


class RevokeTest(AccountsTest):
    def setUp(self):
        super().setUp()
        self.ben = self.accounts.create_user("ben", None, "pw-12345")

    def stored(self) -> list[int]:
        return [i.id for i in db.session.query(InviteToken).order_by(InviteToken.id)]

    def test_the_creator_revokes_an_unused_invite(self):
        invite = self.make_invite(self.ana)
        kept = self.make_invite(self.ana)

        self.accounts.revoke(self.ana, invite.id)

        self.assertEqual(self.stored(), [kept.id])

    def test_someone_elses_and_unknown_invites_are_unknown_and_used_ones_stay(self):
        bens = self.make_invite(self.ben)
        used = self.make_invite(self.ana, used=True)

        self.refused(AccountError.UNKNOWN_INVITE, self.accounts.revoke, self.ana, bens.id)
        self.refused(AccountError.UNKNOWN_INVITE, self.accounts.revoke, self.ana, 999)
        self.refused(AccountError.USED_INVITE, self.accounts.revoke, self.ana, used.id)

        self.assertEqual(self.stored(), [bens.id, used.id])


class UpdateProfileTest(AccountsTest):
    def test_given_fields_change_and_the_others_stay(self):
        self.accounts.update_profile(self.ana, {"name": "ana b", "color": "#123456", "glow_effect": True})

        self.assertEqual(
            (self.ana.name, self.ana.color, self.ana.glow_effect, self.ana.language, self.ana.email),
            ("ana b", "#123456", True, "de", "ana@example.com"),
        )
        self.assertEqual(self.history(self.ana), [])

    def test_diet_is_normalized(self):
        cases = (
            ({"meat": True, "vegetarian": False, "vegan": False}, (True, True, True)),
            ({"meat": False, "vegetarian": True, "vegan": False}, (False, True, True)),
            ({"meat": False, "vegetarian": False, "vegan": False}, (False, True, True)),
            ({"meat": False, "vegetarian": False, "vegan": True}, (False, False, True)),
        )
        for diet, expected in cases:
            with self.subTest(diet=diet):
                self.accounts.update_profile(self.ana, diet)

                self.assertEqual((self.ana.meat, self.ana.vegetarian, self.ana.vegan), expected)

    def test_a_picture_is_set_and_removed_through_the_history(self):
        self.accounts.update_profile(self.ana, {"profile_picture": "/pics/new.png"})
        self.assertEqual(self.ana.get_profile_picture(), "/pics/new.png")

        self.accounts.update_profile(self.ana, {"profile_picture": None})

        self.assertIsNone(self.ana.get_profile_picture())
        history = self.history(self.ana)
        self.assertEqual(sorted(h.profile_picture or "" for h in history), ["", "/pics/new.png"])
        self.assertEqual({h.level_id for h in history}, {self.levels[0].id})


class ChangePasswordTest(AccountsTest):
    def test_the_new_password_signs_in_and_the_token_version_moves_on(self):
        version = self.ana.token_version

        self.accounts.change_password(self.ana, "correct horse", "much-longer")

        self.assertEqual(self.ana.token_version, version + 1)
        self.assertEqual(self.accounts.sign_in("ana", "much-longer"), self.ana)
        self.refused(AccountError.BAD_CREDENTIALS, self.accounts.sign_in, "ana", "correct horse")

    def test_a_wrong_current_password_changes_nothing(self):
        password, version = self.ana.password, self.ana.token_version

        self.refused(AccountError.WRONG_PASSWORD, self.accounts.change_password, self.ana, "wrong", "much-longer")

        self.assertEqual((self.ana.password, self.ana.token_version), (password, version))

    def test_a_guest_has_no_password_to_change(self):
        guest, _ = self.accounts.join_as_guest(self.make_session("s1").join_code, "ben", None)

        self.refused(AccountError.WRONG_PASSWORD, self.accounts.change_password, guest, "", "much-longer")

        self.assertIsNone(guest.password)


class AdminTest(AccountsTest):
    def test_admin_is_granted_and_revoked(self):
        self.accounts.set_admin(self.ana, True)
        self.assertTrue(self.ana.is_admin)
        self.accounts.set_admin(self.ana, True)
        self.assertTrue(self.ana.is_admin)

        self.accounts.set_admin(self.ana, False)

        self.assertFalse(self.ana.is_admin)

    def test_the_seed_creates_an_admin_at_the_lowest_level(self):
        admin = self.accounts.create_user("admin", None, "pw-12345", is_admin=True)

        self.assertEqual((admin.is_admin, admin.level_id, admin.experience_points), (True, self.levels[0].id, 0))
        self.assertEqual(self.accounts.sign_in("admin", "pw-12345"), admin)
