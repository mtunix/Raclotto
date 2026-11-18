import random
import unittest

from back.src.driver.database import db
from back.src.dto.pan import RollOutcomeDto
from back.src.dto.user import UserSummaryDto
from back.src.entity.ingredient import IngredientType
from back.src.entity.pan import Pan
from back.src.entity.user import user_sessions
from back.src.interactor.pan_roll import (
    PanRoll,
    RollError,
    RollOptions,
    split_columns,
)
from back.test.support import AppTest

FILL, SAUCE = IngredientType.FILL, IngredientType.SAUCE


class TestSplitColumns(unittest.TestCase):
    def test_invariants_over_all_small_inputs(self):
        rng = random.Random(0)
        for total in range(1, 13):
            for fills in range(0, 7):
                for sauces in range(0, 7):
                    for _ in range(5):
                        f, s = split_columns(total, fills, sauces, rng)
                        where = (total, fills, sauces, f, s)
                        self.assertLessEqual(f, fills, where)
                        self.assertLessEqual(s, sauces, where)
                        self.assertEqual(f + s, min(total, fills + sauces), where)
                        if fills and sauces and total >= 2:
                            self.assertGreaterEqual(f, 1, where)
                            self.assertGreaterEqual(s, 1, where)

    def test_the_old_over_allocation_case(self):
        # pan_api.py used to hand out more fills than columns here.
        rng = random.Random(1)
        for _ in range(50):
            f, s = split_columns(6, 5, 1, rng)
            self.assertEqual((f, s), (5, 1))


class TestPanRoll(AppTest):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("ana", meat=True, fish=False)
        self.session = self.make_session("s1", creator=self.user)
        self.pork = self.make_ingredient(self.session, "Pork", FILL, meat=True)
        self.salmon = self.make_ingredient(self.session, "Salmon", FILL, fish=True)
        self.potato = self.make_ingredient(self.session, "Potato", FILL, vegan=True)
        self.aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.roll = PanRoll(rng=random.Random(42), name_pan=lambda: "Test Pan")

    def test_classic_roll_respects_the_fish_flag(self):
        seen = set()
        for _ in range(15):
            outcome = self.roll.roll(self.user, "s1", RollOptions(num_fill=3, num_sauce=1))
            seen |= {i.name for i in outcome.pan.ingredients}
        self.assertNotIn("Salmon", seen)
        self.assertIn("Pork", seen)

    def test_roll_reports_the_reward_it_granted(self):
        outcome = self.roll.roll(self.user, "s1", RollOptions(num_fill=1, num_sauce=1))

        db.session.refresh(self.user)
        self.assertGreater(outcome.reward.xp_gained, 0)
        self.assertEqual(outcome.reward.xp_before, 0)
        self.assertEqual(outcome.reward.xp_after, self.user.experience_points)
        self.assertEqual(outcome.reward.level.id, self.user.level_id)
        self.assertFalse(outcome.reward.leveled_up)

    def test_crossing_a_threshold_is_a_level_up(self):
        user = self.make_user("ben", experience_points=95, meat=True)
        outcome = self.roll.roll(user, "s1", RollOptions(num_fill=2, num_sauce=1))

        self.assertTrue(outcome.reward.leveled_up)
        self.assertEqual(outcome.reward.previous_level.required_experience, 0)
        self.assertEqual(outcome.reward.level.required_experience, 100)
        self.assertEqual(outcome.reward.next_level.required_experience, 250)

    def test_first_roll_unlocks_first_blood_and_joins_the_session_once(self):
        first = self.roll.roll(self.user, "s1", RollOptions(num_fill=1, num_sauce=0))
        second = self.roll.roll(self.user, "s1", RollOptions(num_fill=1, num_sauce=0))

        self.assertIn("First Blood!", [a.title for a in first.achievements])
        self.assertNotIn("First Blood!", [a.title for a in second.achievements])
        memberships = db.session.query(user_sessions).filter_by(user_id=self.user.id).all()
        self.assertEqual(len(memberships), 1)

    def test_bandit_roll_fills_exactly_the_requested_columns(self):
        for columns in (1, 2, 3, 4):
            outcome = self.roll.roll(self.user, "s1", RollOptions(total_columns=columns))
            self.assertEqual(len(outcome.pan.ingredients), min(columns, 3))

    def test_rolled_preparation_type_and_cheese_are_recorded(self):
        outcome = self.roll.roll(
            self.user,
            "s1",
            RollOptions(total_columns=2, roll_preparation_type=True, roll_cheese=True),
        )
        self.assertTrue(outcome.pan.rolled_preparation_type)
        self.assertIsNotNone(outcome.pan.preparation_type_id)
        self.assertTrue(outcome.pan.rolled_cheese)
        self.assertIn(outcome.pan.cheese_level, range(10))

    def test_hand_picked_pan_only_takes_ingredients_from_its_session(self):
        other = self.make_session("s2")
        foreign = self.make_ingredient(other, "Foreign", FILL)
        outcome = self.roll.roll(
            self.user, "s1", RollOptions(ingredient_ids=[self.pork.id, foreign.id], name="Mine")
        )
        self.assertEqual([i.name for i in outcome.pan.ingredients], ["Pork"])
        self.assertEqual(outcome.pan.name, "Mine")

    def test_unknown_session_is_a_roll_error(self):
        with self.assertRaises(RollError) as raised:
            self.roll.roll(self.user, "nope", RollOptions(num_fill=1))
        self.assertEqual(raised.exception.kind, RollError.SESSION_NOT_FOUND)

    def test_failure_after_the_pan_is_built_leaves_nothing_behind(self):
        class Exploding:
            def record(self, fact):
                raise RuntimeError("boom")

        roll = PanRoll(rng=random.Random(0), achievements=Exploding())
        with self.assertRaises(RuntimeError):
            roll.roll(self.user, "s1", RollOptions(num_fill=1, num_sauce=1))

        self.assertEqual(db.session.query(Pan).count(), 0)
        db.session.refresh(self.user)
        self.assertEqual(self.user.experience_points, 0)


class TestRollRoutes(AppTest):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("ana", meat=True, color="#00ff00", border_texture="cheese")
        self.session = self.make_session("s1", creator=self.user)
        self.pork = self.make_ingredient(self.session, "Pork", FILL, meat=True)
        self.potato = self.make_ingredient(self.session, "Potato", FILL)
        self.aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)

    def roll(self, path: str, body: dict, user=None, **query):
        return self.call("POST", path, user or self.user, body=body, query={"session_key": "s1", **query})

    def assert_outcome(self, response) -> RollOutcomeDto:
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), {"pan", "reward", "achievements", "events"})
        return RollOutcomeDto.model_validate(response.json)

    def test_generate_returns_the_roll_outcome(self):
        outcome = self.assert_outcome(self.roll("/pans/generate", {"num_fill": 2, "num_sauce": 1}))

        self.assertEqual(len(outcome.pan.ingredients), 3)
        self.assertEqual(outcome.reward.xp_after - outcome.reward.xp_before, outcome.reward.xp_gained)
        self.assertGreater(outcome.reward.xp_gained, 0)
        self.assertIn("First Blood!", [a.title for a in outcome.achievements])
        self.assertEqual(outcome.events, [])

    def test_every_roll_route_names_the_author(self):
        for path, body in (
            ("/pans/generate", {"num_fill": 1, "num_sauce": 1}),
            ("/pans/generate/bandit", {"total_columns": 2}),
            ("/pans", {"ingredients": [self.pork.id, self.aioli.id]}),
        ):
            with self.subTest(path):
                pan = self.assert_outcome(self.roll(path, body)).pan
                self.assertEqual(pan.user_id, self.user.id)
                self.assertEqual(pan.author, UserSummaryDto(
                    id=self.user.id, name="ana", color="#00ff00", profile_picture=None,
                    border_style="solid", border_texture="cheese", glow_effect=False,
                ))

    def test_classic_roll_defaults_to_three_fills_and_two_sauces(self):
        outcome = self.assert_outcome(self.roll("/pans/generate", {}))

        # Two fills and one sauce are all the session offers.
        self.assertEqual(len(outcome.pan.ingredients), 3)
        self.assertIsNone(outcome.pan.preparation_type)
        self.assertFalse(outcome.pan.rolled_cheese)

    def test_rolled_preparation_type_and_cheese_come_back_on_the_pan(self):
        pan = self.assert_outcome(
            self.roll("/pans/generate/bandit", {"total_columns": 2, "roll_prep_type": True, "roll_cheese": True})
        ).pan

        self.assertTrue(pan.rolled_preparation_type)
        self.assertEqual(pan.preparation_type.id, pan.preparation_type_id)
        self.assertTrue(pan.rolled_cheese)
        self.assertIn(pan.cheese_level, range(10))

    def test_hand_picked_pan_keeps_its_name(self):
        named = self.assert_outcome(self.roll("/pans", {"ingredients": [self.potato.id], "name": "Mine"})).pan
        unnamed = self.assert_outcome(self.roll("/pans", {"ingredients": [self.potato.id], "name": ""})).pan

        self.assertEqual(named.name, "Mine")
        self.assertEqual([i.name for i in named.ingredients], ["Potato"])
        self.assertTrue(unnamed.name)
        self.assertNotEqual(unnamed.name, "")

    def test_triggered_events_come_back_typed(self):
        ben = self.make_user("ben", meat=True)
        self.assert_outcome(self.roll("/pans/generate", {"num_fill": 1, "num_sauce": 1}))
        outcome = self.assert_outcome(self.roll("/pans/generate", {"num_fill": 1, "num_sauce": 1}, user=ben))

        [event] = outcome.events
        self.assertEqual(event.event_type, "pan_swap")
        self.assertEqual(event.data.pan2_user_name, "ana")
        self.assertEqual(event.data.pan1_id, outcome.pan.id)

    def test_roll_errors_map_to_http_errors(self):
        missing = self.roll("/pans/generate", {}, session_key="nope")
        empty = self.roll("/pans/generate", {"num_fill": 0, "num_sauce": 0})
        foreign = self.roll("/pans", {"ingredients": [999]})
        no_key = self.call("POST", "/pans/generate", self.user, body={})

        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json["errors"][0]["title"], "Session not found")
        self.assertEqual(empty.status_code, 400)
        self.assertEqual(empty.json["errors"][0]["title"], "Invalid ingredient selection")
        self.assertEqual(foreign.status_code, 400)
        self.assertEqual(no_key.status_code, 400)
        self.assertEqual(no_key.json["errors"][0]["source"], {"pointer": "/query/session_key"})

    def test_invalid_roll_bodies_point_at_the_field(self):
        for path, body, pointer in (
            ("/pans/generate/bandit", {"total_columns": 0}, "/body/total_columns"),
            ("/pans/generate/bandit", {}, "/body/total_columns"),
            ("/pans/generate", {"num_fill": -1}, "/body/num_fill"),
            ("/pans/generate", {"numFill": 2}, "/body/numFill"),
            ("/pans", {"ingredients": []}, "/body/ingredients"),
            ("/pans", {"ingredients": [1], "user_id": 2}, "/body/user_id"),
        ):
            with self.subTest(path=path, body=body):
                response = self.roll(path, body)
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], [pointer])
        self.assertEqual(db.session.query(Pan).count(), 0)

    def test_rolling_requires_auth(self):
        for path in ("/pans/generate", "/pans/generate/bandit", "/pans"):
            with self.subTest(path):
                response = self.client.post(f"/api{path}", query_string={"session_key": "s1"}, json={})
                self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
