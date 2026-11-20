from back.src.interactor.accounts import AccountError, Accounts
from back.test.support import AppTest


class SignInTest(AppTest):
    def setUp(self):
        super().setUp()
        self.accounts = Accounts()
        self.ana = self.accounts.create_user("ana", "ana@example.com", "correct horse")

    def test_by_name_or_email(self):
        self.assertEqual(self.accounts.sign_in("ana", "correct horse"), self.ana)
        self.assertEqual(self.accounts.sign_in("ana@example.com", "correct horse"), self.ana)

    def test_a_wrong_password_and_an_unknown_account_are_refused_alike(self):
        for name, password in (("ana", "wrong"), ("nobody", "correct horse")):
            with self.subTest(name=name), self.assertRaises(AccountError) as raised:
                self.accounts.sign_in(name, password)
            self.assertEqual(raised.exception.kind, AccountError.BAD_CREDENTIALS)
