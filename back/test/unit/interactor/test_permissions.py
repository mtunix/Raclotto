import unittest

from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.permissions import Forbidden, Permissions

ANA = User(id=1, name="ana", is_admin=True)
BEN = User(id=2, name="ben", is_admin=False)
CLEO = User(id=3, name="cleo", is_admin=True)


class PermissionsTest(unittest.TestCase):
    def test_a_session_is_its_creators_and_any_admins(self):
        own = RaclottoSession(created_by_user_id=BEN.id)
        orphan = RaclottoSession(created_by_user_id=None)

        self.assertTrue(Permissions(BEN).may_manage_session(own))
        self.assertTrue(Permissions(ANA).may_manage_session(own))
        self.assertFalse(Permissions(BEN).may_manage_session(orphan))
        self.assertTrue(Permissions(ANA).may_manage_session(orphan))

    def test_a_pan_is_its_authors_to_rename_and_any_admins(self):
        pan = Pan(user_id=BEN.id)

        self.assertTrue(Permissions(BEN).may_rename_pan(pan))
        self.assertTrue(Permissions(ANA).may_rename_pan(pan))
        self.assertFalse(Permissions(User(id=4, is_admin=False)).may_rename_pan(pan))

    def test_only_its_author_deletes_a_pan_not_even_an_admin(self):
        pan = Pan(user_id=BEN.id)

        self.assertTrue(Permissions(BEN).may_delete_pan(pan))
        self.assertFalse(Permissions(ANA).may_delete_pan(pan))
        self.assertFalse(Permissions(User(id=4, is_admin=False)).may_delete_pan(pan))
        with self.assertRaises(Forbidden):
            Permissions(ANA).delete_pan(pan)
        Permissions(BEN).delete_pan(pan)

    def test_only_admins_see_and_change_admin_rights(self):
        self.assertTrue(Permissions(ANA).may_manage_admins())
        self.assertFalse(Permissions(BEN).may_manage_admins())
        self.assertTrue(Permissions(ANA).may_change_admin(BEN))
        self.assertTrue(Permissions(ANA).may_change_admin(CLEO))
        self.assertFalse(Permissions(BEN).may_change_admin(ANA))
        self.assertFalse(Permissions(BEN).may_change_admin(BEN))

    def test_an_admin_never_changes_their_own_admin(self):
        self.assertFalse(Permissions(ANA).may_change_admin(ANA))
        with self.assertRaises(Forbidden):
            Permissions(ANA).change_admin(ANA)

    def test_the_checks_raise_what_the_answers_refuse(self):
        with self.assertRaises(Forbidden):
            Permissions(BEN).manage_admins()
        with self.assertRaises(Forbidden):
            Permissions(BEN).change_admin(CLEO)
        with self.assertRaises(Forbidden):
            Permissions(BEN).change_global()
        Permissions(ANA).manage_admins()
        Permissions(ANA).change_admin(BEN)
        Permissions(ANA).change_global()
