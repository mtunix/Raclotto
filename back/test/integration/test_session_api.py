from datetime import datetime

from back.src.driver.database import db
from back.src.dto.session import SessionDto
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import user_sessions
from back.test.support import AppTest


class SessionApiTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.ben = self.make_user("ben", meat=True)

    def pointers(self, response) -> list:
        self.assertEqual(response.status_code, 400, response.json)
        return [error["source"]["pointer"] for error in response.json["errors"]]

    def stored(self, session_id: int) -> RaclottoSession:
        db.session.expire_all()
        return db.session.get_one(RaclottoSession, session_id)

    def closed(self, key: str) -> RaclottoSession:
        session = self.make_session(key, creator=self.ana)
        session.active = False
        db.session.commit()
        return session


class TestCreateSession(SessionApiTest):
    def test_create_returns_the_session_and_the_creator_joins_it(self):
        response = self.call("POST", "/sessions", self.ana, body={"name": "Friday"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), set(SessionDto.model_fields))
        session = SessionDto.model_validate(response.json)
        self.assertEqual((session.name, session.active, session.created_by_user_id), ("Friday", True, self.ana.id))
        self.assertTrue(session.key)
        self.assertEqual(response.json["timestamp"], session.timestamp.isoformat())
        members = db.session.execute(user_sessions.select().where(user_sessions.c.session_id == session.id)).all()
        self.assertEqual([m.user_id for m in members], [self.ana.id])

    def test_create_needs_a_name_and_a_token(self):
        self.assertEqual(self.pointers(self.call("POST", "/sessions", self.ana, body={"name": ""})), ["/body/name"])
        self.assertEqual(self.pointers(self.call("POST", "/sessions", self.ana, body={})), ["/body/name"])
        self.assertEqual(self.call("POST", "/sessions", body={"name": "Friday"}).status_code, 401)
        self.assertEqual(db.session.query(RaclottoSession).count(), 0)


class TestReadSessions(SessionApiTest):
    def test_list_shows_active_sessions_unless_asked_for_all(self):
        open_ = self.make_session("open")
        closed = self.closed("closed")

        active = self.call("GET", "/sessions", self.ben)
        every = self.call("GET", "/sessions", self.ben, query={"include_inactive": "true"})

        self.assertEqual([s["id"] for s in active.json], [open_.id])
        self.assertEqual(sorted(s["id"] for s in every.json), [open_.id, closed.id])
        self.assertEqual(self.pointers(self.call("GET", "/sessions", self.ben, query={"include_inactive": "maybe"})),
                         ["/query/include_inactive"])
        self.assertEqual(self.call("GET", "/sessions").status_code, 401)

    def test_get_by_id_and_by_key(self):
        session = self.make_session("s1", creator=self.ana)

        by_id = self.call("GET", f"/sessions/{session.id}", self.ben)
        by_key = self.call("GET", "/sessions/by-key", self.ben, query={"session_key": "s1"})

        self.assertEqual(by_id.status_code, 200, by_id.json)
        self.assertEqual(by_id.json, by_key.json)
        self.assertEqual((by_id.json["key"], by_id.json["created_by_user_id"]), ("s1", self.ana.id))

    def test_unknown_sessions_are_404(self):
        self.assertEqual(self.call("GET", "/sessions/999", self.ana).status_code, 404)
        missing = self.call("GET", "/sessions/by-key", self.ana, query={"session_key": "nope"})
        self.assertEqual((missing.status_code, missing.json["errors"][0]["title"]), (404, "Session not found"))

    def test_by_key_needs_the_key(self):
        self.assertEqual(self.pointers(self.call("GET", "/sessions/by-key", self.ana)), ["/query/session_key"])


class TestChangeSession(SessionApiTest):
    def test_rename_changes_only_the_name(self):
        session = self.make_session("s1", creator=self.ana)

        response = self.call("PATCH", f"/sessions/{session.id}", self.ana, body={"name": "Saturday"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual((response.json["name"], response.json["key"]), ("Saturday", "s1"))
        self.assertEqual(self.stored(session.id).name, "Saturday")

    def test_rename_takes_only_a_name(self):
        session = self.make_session("s1")

        self.assertEqual(self.pointers(self.call("PATCH", f"/sessions/{session.id}", self.ana, body={})),
                         ["/body/name"])
        self.assertEqual(
            self.pointers(self.call("PATCH", f"/sessions/{session.id}", self.ana, body={"name": "x", "active": False})),
            ["/body/active"],
        )
        self.assertTrue(self.stored(session.id).active)
        self.assertEqual(self.call("PATCH", "/sessions/999", self.ana, body={"name": "x"}).status_code, 404)

    def test_delete(self):
        session = self.make_session("s1")

        response = self.call("DELETE", f"/sessions/{session.id}", self.ana)

        self.assertEqual((response.status_code, response.get_data()), (204, b""))
        db.session.expire_all()
        self.assertIsNone(db.session.get(RaclottoSession, session.id))
        self.assertEqual(self.call("DELETE", f"/sessions/{session.id}", self.ana).status_code, 404)

    def test_close_judges_the_achievements_waiting_for_the_end(self):
        session = self.make_session("s1", creator=self.ana)
        potato = self.make_ingredient(session, "Potato")
        self.make_pan(self.ana, session, [potato], minutes_ago=5)
        self.make_pan(self.ben, session, [potato], minutes_ago=1)

        response = self.call("POST", "/sessions/close", self.ana, body={"key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertFalse(response.json["active"])
        self.assertFalse(self.stored(session.id).active)
        db.session.refresh(self.ben)
        self.assertIn("Last Pan standing", {a.title for a in self.ben.achievements})

    def test_reactivate(self):
        session = self.closed("s1")

        response = self.call("POST", "/sessions/reactivate", self.ben, body={"key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertTrue(response.json["active"])
        self.assertTrue(self.stored(session.id).active)

    def test_close_and_reactivate_need_a_known_key(self):
        for path in ("/sessions/close", "/sessions/reactivate"):
            with self.subTest(path=path):
                self.assertEqual(self.pointers(self.call("POST", path, self.ana, body={})), ["/body/key"])
                self.assertEqual(self.call("POST", path, self.ana, body={"key": "nope"}).status_code, 404)
                self.assertEqual(self.call("POST", path, body={"key": "nope"}).status_code, 401)

    def test_any_signed_in_user_may_change_any_session(self):
        session = self.make_session("s1", creator=self.ana)

        self.assertEqual(self.call("PATCH", f"/sessions/{session.id}", self.ben, body={"name": "mine"}).status_code, 200)
        self.assertEqual(self.call("POST", "/sessions/close", self.ben, body={"key": "s1"}).status_code, 200)
        self.assertEqual(self.call("POST", "/sessions/reactivate", self.ben, body={"key": "s1"}).status_code, 200)
        self.assertEqual(self.call("DELETE", f"/sessions/{session.id}", self.ben).status_code, 204)

    def test_timestamp_is_iso_without_a_zone(self):
        session = self.make_session("s1")
        session.timestamp = datetime(2026, 11, 18, 19, 30, 5)
        db.session.commit()

        self.assertEqual(self.call("GET", f"/sessions/{session.id}", self.ana).json["timestamp"], "2026-11-18T19:30:05")
