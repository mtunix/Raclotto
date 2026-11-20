from back.src.driver.database import db
from back.src.entity.raclotto_session import RaclottoSession
from back.test.integration.probe_api import ProbeApi
from back.test.support import AppTest


class RequestTransactionTest(AppTest):
    """The endpoint machinery commits after the handler's response, and rolls back when it raises."""

    extra_apis = (ProbeApi,)

    def stored(self, key: str) -> bool:
        return db.session.query(RaclottoSession).filter_by(key=key).first() is not None

    def test_a_write_is_committed_without_the_handler_committing(self):
        response = self.call("POST", "/probe/sessions", body={"key": "kept"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertFalse(db.session().in_transaction())
        db.session.rollback()
        self.assertTrue(self.stored("kept"))

    def test_a_handler_that_raises_after_writing_leaves_nothing(self):
        with self.recorded_writes() as writes:
            response = self.call("POST", "/probe/sessions/failing", body={"key": "lost"})

        self.assertEqual(response.status_code, 409)
        self.assertTrue(any(write.startswith("INSERT INTO session") for write in writes))
        self.assertFalse(db.session().in_transaction())
        self.assertFalse(self.stored("lost"))

    def test_a_get_ends_its_transaction_without_committing(self):
        response = self.call("GET", "/probe/sessions", query={"key": "read"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertFalse(db.session().in_transaction())
        self.assertFalse(self.stored("read"))
