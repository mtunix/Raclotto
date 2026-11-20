from datetime import datetime

from sqlalchemy import func, select, text

from back.src.driver.database import db
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto
from back.src.dto.session import SessionDto
from back.src.dto.session_recap import BoldestPanDto, ParticipantRecapDto, SessionRecapDto
from back.src.dto.stats import IngredientUsageDto
from back.src.dto.user import UserSummaryDto
from back.src.entity.achievement import AchievementKey
from back.src.entity.event import Event
from back.src.entity.ingredient import IngredientType
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.rating import Rating
from back.src.entity.user import User, user_sessions
from back.src.interactor.levels import Levels
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

    def test_creating_a_session_unlocks_local_host_for_its_creator(self):
        self.call("POST", "/sessions", self.ana, body={"name": "Friday"})

        db.session.expire_all()
        ana, ben = db.session.get_one(User, self.ana.id), db.session.get_one(User, self.ben.id)
        self.assertEqual([a.key for a in ana.achievements], [AchievementKey.local_host])
        self.assertEqual(ben.achievements, [])

    def test_a_session_without_a_key_gets_a_generated_one(self):
        session = RaclottoSession(name="Friday")
        db.session.add(session)
        db.session.commit()

        self.assertIsInstance(self.stored(session.id).key, str)

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
        self.assertEqual(
            self.pointers(self.call("GET", "/sessions", self.ben, query={"include_inactive": "maybe"})),
            ["/query/include_inactive"],
        )
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


class TestSessionRecap(SessionApiTest):
    def test_the_recap_as_json(self):
        session = self.make_session("s1", creator=self.ana)
        chili = self.make_ingredient(session, "Chili", spicy=2, wildcard=True)
        plain = self.make_pan(self.ana, session, [chili], minutes_ago=10)
        bold = self.make_pan(self.ben, session, [chili, self.make_ingredient(session, "Leek")], minutes_ago=5)
        for pan, rater, stars in ((plain, self.ben, 2), (bold, self.ana, 5)):
            db.session.add(Rating(rating=stars, user_id=rater.id, pan_id=pan.id, session_id=session.id))
        db.session.commit()

        response = self.call("GET", "/sessions/recap", self.ana, query={"session_key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), set(SessionRecapDto.model_fields))
        recap = SessionRecapDto.model_validate(response.json)
        db.session.expire_all()
        bold_dto, xp = PanDto.of(bold, self.ben), Levels().xp_for(bold)
        self.assertEqual(recap.session, SessionDto.model_validate(session))
        self.assertEqual((recap.pan_count, recap.rating_count), (2, 2))
        self.assertEqual(response.json["last_pan_at"], bold.timestamp.isoformat())
        self.assertEqual((recap.best_pan, recap.worst_pan), (bold_dto, PanDto.of(plain, self.ana)))
        self.assertEqual(recap.boldest_pan, BoldestPanDto(pan=bold_dto, xp=xp))
        self.assertEqual(
            recap.favorite_ingredient, IngredientUsageDto(ingredient=IngredientDto.model_validate(chili), pan_count=2)
        )
        self.assertEqual(
            recap.participants[0],
            ParticipantRecapDto(
                user=UserSummaryDto.of(self.ben), pan_count=1, xp=xp, average_rating=5.0, ratings_given=1
            ),
        )

    def test_the_recap_needs_a_known_session_and_auth(self):
        missing = self.call("GET", "/sessions/recap", self.ana, query={"session_key": "nope"})
        self.assertEqual(
            (missing.status_code, missing.json["errors"][0]["code"]), (404, "api_error_code.resource_not_found")
        )
        self.assertEqual(self.pointers(self.call("GET", "/sessions/recap", self.ana)), ["/query/session_key"])
        self.assertEqual(self.call("GET", "/sessions/recap", query={"session_key": "nope"}).status_code, 401)


class TestChangeSession(SessionApiTest):
    def test_rename_changes_only_the_name(self):
        session = self.make_session("s1", creator=self.ana)

        response = self.call("PATCH", f"/sessions/{session.id}", self.ana, body={"name": "Saturday"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual((response.json["name"], response.json["key"]), ("Saturday", "s1"))
        self.assertEqual(self.stored(session.id).name, "Saturday")

    def test_rename_takes_only_a_name(self):
        session = self.make_session("s1")

        self.assertEqual(
            self.pointers(self.call("PATCH", f"/sessions/{session.id}", self.ana, body={})), ["/body/name"]
        )
        self.assertEqual(
            self.pointers(self.call("PATCH", f"/sessions/{session.id}", self.ana, body={"name": "x", "active": False})),
            ["/body/active"],
        )
        self.assertTrue(self.stored(session.id).active)
        self.assertEqual(self.call("PATCH", "/sessions/999", self.ana, body={"name": "x"}).status_code, 404)

    def test_delete(self):
        session = self.make_session("s1", creator=self.ana)

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

        response = self.call("POST", "/sessions/reactivate", self.ana, body={"key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertTrue(response.json["active"])
        self.assertTrue(self.stored(session.id).active)

    def test_close_and_reactivate_need_a_known_key(self):
        for path in ("/sessions/close", "/sessions/reactivate"):
            with self.subTest(path=path):
                self.assertEqual(self.pointers(self.call("POST", path, self.ana, body={})), ["/body/key"])
                self.assertEqual(self.call("POST", path, self.ana, body={"key": "nope"}).status_code, 404)
                self.assertEqual(self.call("POST", path, body={"key": "nope"}).status_code, 401)

    def changes(self, session: RaclottoSession, user: User) -> list[int]:
        return [
            self.call("PATCH", f"/sessions/{session.id}", user, body={"name": "mine"}).status_code,
            self.call("POST", "/sessions/close", user, body={"key": session.key}).status_code,
            self.call("POST", "/sessions/reactivate", user, body={"key": session.key}).status_code,
            self.call("DELETE", f"/sessions/{session.id}", user).status_code,
        ]

    def test_only_the_creator_may_change_a_session(self):
        session = self.make_session("s1", creator=self.ana)

        self.assertEqual(self.changes(session, self.ben), [403, 403, 403, 403])
        stored = self.stored(session.id)
        self.assertEqual((stored.name, stored.active), ("s1", True))
        self.assertEqual(self.changes(session, self.ana), [200, 200, 200, 204])

    def test_an_admin_may_change_any_session(self):
        root = self.make_user("root", is_admin=True)

        self.assertEqual(self.changes(self.make_session("s1", creator=self.ana), root), [200, 200, 200, 204])
        self.assertEqual(self.changes(self.make_session("s2"), root), [200, 200, 200, 204])

    def test_a_session_without_a_creator_is_only_an_admins_to_change(self):
        session = self.make_session("s1")

        self.assertEqual(self.changes(session, self.ana), [403, 403, 403, 403])

    def test_timestamp_is_iso_without_a_zone(self):
        session = self.make_session("s1")
        session.timestamp = datetime(2026, 11, 18, 19, 30, 5)
        db.session.commit()

        self.assertEqual(self.call("GET", f"/sessions/{session.id}", self.ana).json["timestamp"], "2026-11-18T19:30:05")


class TestDeleteSession(SessionApiTest):
    """Deleting a session takes everything in it along; another session's rows stay."""

    def furnish(self, key: str) -> RaclottoSession:
        """A session ana created and ben joined, with ingredients, pans, ratings, events and configs."""
        session = self.make_session(key, creator=self.ana)
        potato = self.make_ingredient(session, "Potato")
        self.make_ingredient(session, "Aioli", IngredientType.SAUCE)
        prep_type = self.call("POST", "/preparation_type", self.ana, body={"name": "Fried"}, query={"session_key": key})
        rolled = self.call(
            "POST",
            "/pans/generate",
            self.ana,
            body={"num_fill": 1, "num_sauce": 1, "preparation_type_id": prep_type.json["id"]},
            query={"session_key": key},
        )
        picked = self.call("POST", "/pans", self.ben, body={"ingredients": [potato.id]}, query={"session_key": key})
        for response in (prep_type, rolled, picked):
            self.assertEqual(response.status_code, 200, response.json)
        rated = self.call("POST", "/ratings", self.ben, body={"pan_id": rolled.json["pan"]["id"], "rating": 4})
        event = Event(session_id=session.id, event_type="pan_swap", message="swap", data={})
        db.session.add(event)
        db.session.commit()
        dismissed = self.call("POST", f"/events/{event.id}/dismiss", self.ben)
        configured = self.call(
            "POST", "/events/configs", self.ana, body={"event_type": "pan_swap", "enabled": False, "session_key": key}
        )
        self.assertEqual((rated.status_code, dismissed.status_code, configured.status_code), (200, 204, 200))
        return session

    def rows(self) -> dict[str, int]:
        db.session.expire_all()
        return {
            table.name: db.session.execute(select(func.count()).select_from(table)).scalar_one()
            for table in db.metadata.sorted_tables
        }

    def referencing(self, session: RaclottoSession) -> dict[str, int]:
        """Rows of every table with a session_id column that name the session."""
        counts = {
            table.name: db.session.execute(
                select(func.count()).select_from(table).where(table.c.session_id == session.id)
            ).scalar_one()
            for table in db.metadata.sorted_tables
            if "session_id" in table.c
        }
        return {name: count for name, count in counts.items() if count}

    def test_deleting_a_session_removes_everything_in_it(self):
        self.furnish("kept")
        before = self.rows()
        doomed = self.furnish("doomed")

        response = self.call("DELETE", f"/sessions/{doomed.id}", self.ana)

        self.assertEqual(response.status_code, 204, response.json)
        self.assertEqual(self.referencing(doomed), {})
        self.assertEqual(db.session.execute(text("PRAGMA foreign_key_check")).all(), [])
        # Achievements earned in the session may stay, as for a deleted pan.
        changed = {name for name, count in self.rows().items() if count != before[name]}
        self.assertLessEqual(changed, {"user_achievements", "user_achievement_progress"})

    def test_another_sessions_pan_loses_only_the_deleted_sessions_ingredient(self):
        doomed, kept = self.make_session("doomed", creator=self.ana), self.make_session("kept", creator=self.ana)
        potato, onion = self.make_ingredient(doomed, "Potato"), self.make_ingredient(kept, "Onion")
        # Hand-picked pans take only their session's ingredients now; older rows may mix them.
        pan = self.make_pan(self.ben, kept, [potato, onion])

        self.assertEqual(self.call("DELETE", f"/sessions/{doomed.id}", self.ana).status_code, 204)

        fetched = self.call("GET", f"/pans/{pan.id}", self.ana).json
        self.assertEqual([i["name"] for i in fetched["ingredients"]], ["Onion"])
        self.assertEqual(db.session.execute(text("PRAGMA foreign_key_check")).all(), [])

    def test_the_creators_profile_stats_and_pans_still_load_after_deleting_a_session(self):
        doomed = self.furnish("doomed")

        self.assertEqual(self.call("DELETE", f"/sessions/{doomed.id}", self.ana).status_code, 204)

        for path, query in (
            (f"/users/{self.ana.id}", None),
            (f"/users/{self.ana.id}/stats", None),
            ("/pans", {"user_id": self.ana.id}),
            ("/pans", None),
            ("/stats", None),
            ("/achievements", None),
            ("/auth/me", None),
        ):
            with self.subTest(path=path, query=query):
                response = self.call("GET", path, self.ana, query=query)
                self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(self.call("GET", "/pans", self.ana).json["items"], [])
