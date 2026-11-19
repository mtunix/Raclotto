from datetime import datetime, timedelta

from back.src.driver.database import db
from back.src.dto.event import EventType
from back.src.entity.event import Event
from back.src.entity.event_config import EventConfig
from back.src.interactor.event_evaluator import EventEvaluator, Triggered
from back.src.interactor.events import Events, default_evaluators
from back.src.interactor.facts import Fact, PanRolled, SessionClosed
from back.test.support import AppTest


class Always(EventEvaluator):
    event_type = "always"

    def evaluate(self, fact: Fact) -> Triggered | None:
        return Triggered("It happened", {"n": 1})


class Broken(EventEvaluator):
    event_type = "broken"

    def evaluate(self, fact: Fact) -> Triggered | None:
        raise RuntimeError("boom")


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 19, 20, 0)

    def __call__(self) -> datetime:
        return self.now


class EventsTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.session = self.make_session("s1", creator=self.ana)
        self.potato = self.make_ingredient(self.session, "Potato")
        self.clock = Clock()

    def rolled(self, user=None, minutes_ago: int = 0) -> PanRolled:
        user = user or self.ana
        return PanRolled(
            pan=self.make_pan(user, self.session, [self.potato], minutes_ago), user=user, session=self.session
        )

    def configure(self, enabled: bool, session=None, frequency_minutes=None, event_type="always") -> EventConfig:
        config = EventConfig(
            event_type=event_type,
            enabled=enabled,
            frequency_minutes=frequency_minutes,
            session_id=session.id if session else None,
        )
        db.session.add(config)
        db.session.commit()
        return config

    def test_a_fired_event_is_stored_for_the_session(self):
        [event] = Events([Always()], clock=self.clock).record(self.rolled())

        stored = db.session.get(Event, event.id)
        assert stored is not None
        self.assertEqual(
            (stored.session_id, stored.event_type, stored.message, stored.data, stored.created_at),
            (self.session.id, "always", "It happened", {"n": 1}, self.clock.now),
        )

    def test_evaluators_only_hear_the_facts_they_react_to(self):
        self.assertEqual(Events([Always()]).record(SessionClosed(session=self.session)), [])

    def test_a_session_config_overrides_the_global_one(self):
        self.configure(enabled=False)
        other = self.make_session("s2")
        self.configure(enabled=True, session=other)
        events = Events([Always()], clock=self.clock)

        self.assertEqual(events.record(self.rolled()), [])
        self.assertEqual(
            len(events.record(PanRolled(self.make_pan(self.ana, other, [self.potato]), self.ana, other))), 1
        )

    def test_a_session_config_overrides_a_global_one_stored_after_it(self):
        self.configure(enabled=False, session=self.session)
        self.configure(enabled=True)

        self.assertEqual(Events([Always()], clock=self.clock).record(self.rolled()), [])

    def test_a_sessions_configs_are_its_own_and_the_global_ones_it_has_none_for(self):
        own = self.configure(enabled=False, session=self.session)
        self.configure(enabled=True)
        rain = self.configure(enabled=True, event_type="rain")
        self.configure(enabled=True, session=self.make_session("s2"), event_type="rain")

        self.assertEqual({c.id for c in Events([Always()]).configs(self.session)}, {own.id, rain.id})

    def test_an_event_waits_out_its_cooldown(self):
        events = Events([Always()], clock=self.clock)
        events.record(self.rolled())

        self.clock.now += Always.cooldown - timedelta(minutes=1)
        too_soon = events.record(self.rolled())
        self.clock.now += timedelta(minutes=1)
        due = events.record(self.rolled())

        self.assertEqual((len(too_soon), len(due)), (0, 1))

    def test_the_configured_frequency_replaces_the_cooldown(self):
        self.configure(enabled=True, frequency_minutes=5)
        events = Events([Always()], clock=self.clock)
        events.record(self.rolled())

        self.clock.now += timedelta(minutes=5)

        self.assertEqual(len(events.record(self.rolled())), 1)

    def test_a_broken_evaluator_does_not_stop_the_others(self):
        with self.assertLogs("back.src.interactor.events", "ERROR"):
            events = Events([Broken(), Always()]).record(self.rolled())

        self.assertEqual([e.event_type for e in events], ["always"])

    def test_every_evaluated_event_type_can_be_configured(self):
        self.assertEqual({e.event_type for e in default_evaluators()}, set(EventType))


class PanSwapTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.session = self.make_session("s1", creator=self.ana)
        self.potato = self.make_ingredient(self.session, "Potato")

    def roll(self, user, minutes_ago: int = 0) -> list[Event]:
        pan = self.make_pan(user, self.session, [self.potato], minutes_ago)
        return Events().record(PanRolled(pan=pan, user=user, session=self.session))

    def test_two_users_rolling_close_together_swap(self):
        self.roll(self.ana, minutes_ago=9)

        [event] = self.roll(self.ben)

        self.assertEqual(event.event_type, "pan_swap")
        assert event.data is not None
        self.assertEqual((event.data["pan1_user_name"], event.data["pan2_user_name"]), ("ben", "ana"))

    def test_no_swap_with_yourself_or_after_the_window(self):
        self.roll(self.ana, minutes_ago=11)
        self.assertEqual(self.roll(self.ben), [])
        self.assertEqual(self.roll(self.ben), [])
