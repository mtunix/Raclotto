"""Rows the pre-migration API wrote, which today's request bodies no longer allow, still read and write."""

from datetime import datetime

from sqlalchemy import text

from back.src.driver.database import db
from back.src.entity.event import Event
from back.src.entity.event_config import EventConfig
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.pan import Pan
from back.src.entity.rating import Rating
from back.src.entity.user import User
from back.test.support import AppTest


class TestNullNames(AppTest):
    """The old API created ingredients without a name and let a pan's name be set to null."""

    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.session = self.make_session("s1", creator=self.ana)
        self.nameless = Ingredient(name=None, type=IngredientType.FILL, session_id=self.session.id, vegan=True)
        db.session.add(self.nameless)
        db.session.commit()
        self.pan = self.make_pan(self.ana, self.session, [self.nameless])
        self.pan.name = None
        db.session.add(Rating(rating=4, user_id=self.ana.id, pan_id=self.pan.id, session_id=self.session.id))
        db.session.commit()

    def get(self, path: str, **query):
        response = self.call("GET", path, self.ana, query=query)
        self.assertEqual(response.status_code, 200, response.json)
        return response.json

    def test_every_read_shows_the_null_names(self):
        self.assertEqual([i["name"] for i in self.get("/ingredients", session_key="s1")], [None])
        self.assertEqual([i["name"] for i in self.get("/ingredients")], [None])
        self.assertIsNone(self.get(f"/ingredients/{self.nameless.id}")["name"])
        self.assertEqual([i["name"] for i in self.get("/ingredients/export", session_key="s1")["ingredients"]], [None])
        self.assertEqual([p["name"] for p in self.get("/pans")["items"]], [None])
        self.assertEqual([p["name"] for p in self.get("/pans", session_key="s1", limit=1)["items"]], [None])
        pan = self.get(f"/pans/{self.pan.id}")
        self.assertEqual((pan["name"], pan["ingredients"][0]["name"]), (None, None))
        for query in ({}, {"session_key": "s1"}):
            stats = self.get("/stats", **query)
            self.assertEqual([p["name"] for p in stats["pans"]], [None])
            self.assertIsNone(stats["ingredients_top_rated"][0]["ingredient"]["name"])
            self.assertIsNone(stats["ingredients_most_used"][0]["ingredient"]["name"])
        user_stats = self.get(f"/users/{self.ana.id}/stats")
        self.assertIsNone(user_stats["favorite_ingredient"]["name"])
        self.assertIsNone(user_stats["best_rated_ingredient"]["ingredient"]["name"])
        self.assertIsNone(user_stats["most_ingredients_pan"]["name"])

    def test_rolls_succeed_next_to_nameless_rows(self):
        self.make_ingredient(self.session, "Potato")
        # Random rolls skip nameless ingredients; only a hand-picked pan takes one.
        for path, body, names in (("/pans", {"ingredients": [self.nameless.id]}, [None]),
                                  ("/pans/generate", {"num_fill": 1, "num_sauce": 0}, ["Potato"]),
                                  ("/pans/generate/bandit", {"total_columns": 1}, ["Potato"])):
            with self.subTest(path=path):
                response = self.call("POST", path, self.ana, body=body, query={"session_key": "s1"})
                self.assertEqual(response.status_code, 200, response.json)
                self.assertEqual([i["name"] for i in response.json["pan"]["ingredients"]], names)

    def test_writes_on_nameless_rows_succeed(self):
        snacked = self.call("PATCH", f"/pans/{self.pan.id}", self.ana, body={"snacked": True})
        self.assertEqual(snacked.status_code, 200, snacked.json)
        self.assertEqual((snacked.json["name"], snacked.json["snacked"]), (None, True))

        spicy = self.call("PATCH", f"/ingredients/{self.nameless.id}", self.ana, body={"spicy": 1})
        self.assertEqual(spicy.status_code, 200, spicy.json)
        self.assertEqual((spicy.json["name"], spicy.json["spicy"]), (None, 1))

        self.assertEqual(self.call("DELETE", f"/ingredients/{self.nameless.id}", self.ana).status_code, 204)
        refilled = self.call("POST", "/ingredients/refill", self.ana, body={"id": self.nameless.id})
        self.assertEqual(refilled.status_code, 200, refilled.json)
        self.assertIsNone(refilled.json["name"])

    def test_new_names_must_still_be_non_empty(self):
        for method, path, body in (
            ("PATCH", f"/pans/{self.pan.id}", {"name": None}),
            ("PATCH", f"/ingredients/{self.nameless.id}", {"name": None}),
            ("POST", "/ingredients?session_key=s1", {"type": 1, "vegan": True}),
        ):
            with self.subTest(method=method, path=path):
                self.assertEqual(self.call(method, path, self.ana, body=body).status_code, 400)


class TestLegacyEventTypes(AppTest):
    """The old API saved configs for any event type; events of other types or shapes read as they are."""

    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.session = self.make_session("s1", creator=self.ana)

    def test_configs_of_unknown_types_are_listed_and_changed(self):
        rain = EventConfig(event_type="rain", enabled=True, session_id=None)
        db.session.add(rain)
        db.session.commit()

        listed = self.call("GET", "/events/configs", self.ana)
        changed = self.call("PATCH", f"/events/configs/{rain.id}", self.ana, body={"enabled": False})

        self.assertEqual(listed.status_code, 200, listed.json)
        self.assertEqual([c["event_type"] for c in listed.json], ["rain"])
        self.assertEqual(changed.status_code, 200, changed.json)
        self.assertEqual((changed.json["event_type"], changed.json["enabled"]), ("rain", False))

    def test_saving_a_config_still_takes_only_known_types(self):
        response = self.call("POST", "/events/configs", self.ana, body={"event_type": "rain", "enabled": True})
        self.assertEqual(response.status_code, 400, response.json)

    def test_events_of_unknown_types_or_shapes_are_listed(self):
        for event_type, data in (("rain", None), ("rain", {"mm": 3}), ("pan_swap", {"pan1_id": 1})):
            db.session.add(Event(session_id=self.session.id, event_type=event_type, message="m", data=data,
                                 created_at=datetime.now()))
        db.session.commit()

        response = self.call("GET", "/events", self.ana, query={"session_key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertCountEqual(
            [(e["event_type"], e["data"]) for e in response.json],
            [("rain", None), ("rain", {"mm": 3}), ("pan_swap", {"pan1_id": 1})],
        )


class TestResponseBuiltBeforeCommit(AppTest):
    """A response that cannot be built fails the request before anything is committed."""

    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.session = self.make_session("s1", creator=self.ana)
        # The old generic PATCH stored whatever it was sent; a half spicy level passes the
        # range check but is no IngredientDto.
        self.odd = self.make_ingredient(self.session, "Odd")
        db.session.execute(text("UPDATE ingredient SET spicy = 2.5 WHERE id = :id"), {"id": self.odd.id})
        db.session.commit()
        self.pan = self.make_pan(self.ana, self.session, [self.odd])

    def stored(self, entity, entity_id):
        # What the request committed; the app context the test holds outlives the request's.
        db.session.rollback()
        return db.session.get(entity, entity_id)

    def test_patching_a_pan(self):
        response = self.call("PATCH", f"/pans/{self.pan.id}", self.ana, body={"snacked": True, "name": "New"})

        self.assertEqual(response.status_code, 500)
        pan = self.stored(Pan, self.pan.id)
        self.assertEqual((pan.name, pan.snacked), ("pan", False))

    def test_patching_an_ingredient(self):
        response = self.call("PATCH", f"/ingredients/{self.odd.id}", self.ana, body={"name": "New"})

        self.assertEqual(response.status_code, 500)
        self.assertEqual(self.stored(Ingredient, self.odd.id).name, "Odd")

    def test_refilling_an_ingredient(self):
        self.odd.available = False
        db.session.commit()

        response = self.call("POST", "/ingredients/refill", self.ana, body={"id": self.odd.id})

        self.assertEqual(response.status_code, 500)
        self.assertFalse(self.stored(Ingredient, self.odd.id).available)

    def test_rolling_a_pan(self):
        response = self.call("POST", "/pans", self.ana, body={"ingredients": [self.odd.id]},
                             query={"session_key": "s1"})

        self.assertEqual(response.status_code, 500)
        user = self.stored(User, self.ana.id)
        self.assertEqual(db.session.query(Pan).count(), 1)
        self.assertEqual((user.experience_points, user.achievements), (0, []))
