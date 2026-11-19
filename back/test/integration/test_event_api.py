from datetime import datetime, timedelta

from pydantic import TypeAdapter

from back.src.driver.database import db
from back.src.dto.event import EventConfigDto, EventDto
from back.src.entity.event import Event
from back.src.entity.event_config import EventConfig
from back.test.support import AppTest


class EventApiTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.session = self.make_session("s1", creator=self.ana)

    def make_event(self, session=None, minutes_ago: int = 0) -> Event:
        event = Event(
            session_id=(session or self.session).id,
            event_type="pan_swap",
            message="Swap!",
            data={
                "pan1_id": 1,
                "pan1_user_id": self.ana.id,
                "pan1_user_name": "ana",
                "pan2_id": 2,
                "pan2_user_id": self.ben.id,
                "pan2_user_name": "ben",
                "time_window_minutes": 10,
            },
            created_at=datetime.now() - timedelta(minutes=minutes_ago),
        )
        db.session.add(event)
        db.session.commit()
        return event

    def make_config(self, enabled: bool, session=None, frequency_minutes=None) -> EventConfig:
        config = EventConfig(
            event_type="pan_swap",
            enabled=enabled,
            frequency_minutes=frequency_minutes,
            session_id=session.id if session else None,
        )
        db.session.add(config)
        db.session.commit()
        return config

    def events(self, user, session_key: str = "s1") -> list[EventDto]:
        response = self.call("GET", "/events", user, query={"session_key": session_key})
        self.assertEqual(response.status_code, 200, response.json)
        return TypeAdapter(list[EventDto]).validate_python(response.json)

    def configs(self, **query) -> list[EventConfigDto]:
        response = self.call("GET", "/events/configs", self.ana, query=query)
        self.assertEqual(response.status_code, 200, response.json)
        return TypeAdapter(list[EventConfigDto]).validate_python(response.json)

    def test_events_are_the_sessions_newest_first(self):
        older, newer = self.make_event(minutes_ago=5), self.make_event()
        self.make_event(self.make_session("s2"))

        response = self.call("GET", "/events", self.ana, query={"session_key": "s1"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual([e["id"] for e in response.json], [newer.id, older.id])
        self.assertEqual(set(response.json[0]), set(EventDto.model_fields))
        self.assertEqual(response.json[0]["data"]["pan2_user_name"], "ben")

    def test_dismissing_hides_the_event_from_that_user_only(self):
        event = self.make_event()

        response = self.call("POST", f"/events/{event.id}/dismiss", self.ana)

        self.assertEqual((response.status_code, response.get_data()), (204, b""))
        self.assertEqual(self.events(self.ana), [])
        self.assertEqual([e.id for e in self.events(self.ben)], [event.id])

    def test_dismissing_twice_or_an_unknown_event_is_404(self):
        event = self.make_event()
        self.call("POST", f"/events/{event.id}/dismiss", self.ana)

        self.assertEqual(self.call("POST", f"/events/{event.id}/dismiss", self.ana).status_code, 404)
        self.assertEqual(self.call("POST", "/events/999/dismiss", self.ana).status_code, 404)
        self.assertEqual(self.call("POST", f"/events/{event.id}/dismiss", self.ben).status_code, 204)

    def test_events_need_a_known_session(self):
        missing = self.call("GET", "/events", self.ana)
        self.assertEqual(missing.status_code, 400)
        self.assertEqual([e["source"]["pointer"] for e in missing.json["errors"]], ["/query/session_key"])
        self.assertEqual(self.call("GET", "/events", self.ana, query={"session_key": "nope"}).status_code, 404)
        self.assertEqual(self.call("GET", "/events", query={"session_key": "s1"}).status_code, 401)

    def test_configs_of_a_session_are_the_global_ones_and_its_own(self):
        other = self.make_session("s2")
        global_config = self.make_config(True)
        own = self.make_config(False, self.session, frequency_minutes=30)
        others = self.make_config(True, other)

        self.assertEqual({c.id for c in self.configs(session_key="s1")}, {global_config.id, own.id})
        self.assertEqual({c.id for c in self.configs()}, {global_config.id, own.id, others.id})
        # An unknown session is no filter at all.
        self.assertEqual({c.id for c in self.configs(session_key="nope")}, {global_config.id, own.id, others.id})
        [listed] = [c for c in self.configs(session_key="s1") if c.id == own.id]
        self.assertEqual(
            listed.model_dump(),
            {
                "id": own.id,
                "event_type": "pan_swap",
                "session_id": self.session.id,
                "enabled": False,
                "frequency_minutes": 30,
            },
        )

    def test_saving_creates_a_session_config_then_changes_it(self):
        body = {"event_type": "pan_swap", "enabled": False, "frequency_minutes": 20, "session_key": "s1"}

        created = self.call("POST", "/events/configs", self.ana, body=body)
        changed = self.call(
            "POST", "/events/configs", self.ana, body={**body, "enabled": True, "frequency_minutes": None}
        )

        self.assertEqual((created.status_code, changed.status_code), (200, 200))
        self.assertEqual(created.json["id"], changed.json["id"])
        self.assertEqual(created.json["session_id"], self.session.id)
        # A null frequency keeps the stored one.
        self.assertEqual((changed.json["enabled"], changed.json["frequency_minutes"]), (True, 20))
        self.assertEqual(db.session.query(EventConfig).count(), 1)

    def test_saving_a_session_config_leaves_the_global_one_alone(self):
        global_config = self.make_config(enabled=True)

        response = self.call(
            "POST", "/events/configs", self.ana, body={"event_type": "pan_swap", "enabled": False, "session_key": "s1"}
        )

        self.assertEqual(response.status_code, 200, response.json)
        self.assertNotEqual(response.json["id"], global_config.id)
        self.assertEqual(response.json["session_id"], self.session.id)
        db.session.refresh(global_config)
        self.assertTrue(global_config.enabled)

    def test_saving_without_a_session_changes_the_global_config(self):
        response = self.call("POST", "/events/configs", self.ana, body={"event_type": "pan_swap", "enabled": False})

        self.assertEqual(response.status_code, 200)
        self.assertEqual((response.json["session_id"], response.json["frequency_minutes"]), (None, None))

    def test_saving_checks_the_body_and_the_session(self):
        for body, pointer in (
            ({"enabled": True}, "/body/event_type"),
            ({"event_type": "rain", "enabled": True}, "/body/event_type"),
            ({"event_type": "pan_swap"}, "/body/enabled"),
            ({"event_type": "pan_swap", "enabled": True, "session_key": ""}, "/body/session_key"),
        ):
            with self.subTest(body=body):
                response = self.call("POST", "/events/configs", self.ana, body=body)
                self.assertEqual(response.status_code, 400)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], [pointer])
        unknown = {"event_type": "pan_swap", "enabled": True, "session_key": "nope"}
        self.assertEqual(self.call("POST", "/events/configs", self.ana, body=unknown).status_code, 404)

    def test_update_changes_only_the_given_fields(self):
        config = self.make_config(True, self.session, frequency_minutes=30)

        disabled = self.call("PATCH", f"/events/configs/{config.id}", self.ana, body={"enabled": False})
        cleared = self.call("PATCH", f"/events/configs/{config.id}", self.ana, body={"frequency_minutes": None})

        self.assertEqual((disabled.json["enabled"], disabled.json["frequency_minutes"]), (False, 30))
        self.assertEqual((cleared.json["enabled"], cleared.json["frequency_minutes"]), (False, None))

    def test_update_needs_a_change_and_a_known_config(self):
        config = self.make_config(True)

        self.assertEqual(self.call("PATCH", f"/events/configs/{config.id}", self.ana, body={}).status_code, 400)
        self.assertEqual(
            self.call("PATCH", f"/events/configs/{config.id}", self.ana, body={"enabled": None}).status_code, 400
        )
        self.assertEqual(self.call("PATCH", "/events/configs/999", self.ana, body={"enabled": True}).status_code, 404)
