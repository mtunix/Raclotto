import random
import unittest

from back.src.driver.database import db
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
        self.user = self.make_user("ana", meat=True)
        self.session = self.make_session("s1", creator=self.user)
        self.make_ingredient(self.session, "Pork", FILL, meat=True)
        self.make_ingredient(self.session, "Potato", FILL)
        self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)

    def test_generate_returns_pan_with_outcome_meta(self):
        response = self.post(self.user, "/pans/generate", {"numFill": 2, "numSauce": 1}, session_key="s1")

        self.assertEqual(response.status_code, 200, response.json)
        body = response.json
        self.assertEqual(body["data"]["type"], "pan")
        self.assertEqual(len(body["data"]["attributes"]["ingredients"]), 3)
        reward = body["meta"]["reward"]
        self.assertEqual(reward["xp_after"] - reward["xp_before"], reward["xp_gained"])
        self.assertIn("leveled_up", reward)
        self.assertIsInstance(body["meta"]["events"], list)
        titles = [a["attributes"]["title"] for a in body["meta"]["newly_unlocked_achievements"]]
        self.assertIn("First Blood!", titles)

    def test_bandit_and_hand_picked_routes_share_the_envelope(self):
        bandit = self.post(self.user, "/pans/generate/bandit", {"total_columns": 2}, session_key="s1")
        picked = self.post(self.user, "/pans", {"ingredients": [1, 3]}, session_key="s1")

        for response in (bandit, picked):
            self.assertEqual(response.status_code, 200, response.json)
            self.assertEqual(set(response.json["meta"]), {"reward", "events", "newly_unlocked_achievements"})

    def test_triggered_events_are_serialized_in_meta(self):
        ben = self.make_user("ben", meat=True)
        self.post(self.user, "/pans/generate", {"numFill": 1, "numSauce": 1}, session_key="s1")
        response = self.post(ben, "/pans/generate", {"numFill": 1, "numSauce": 1}, session_key="s1")

        self.assertEqual(response.status_code, 200, response.json)
        events = response.json["meta"]["events"]
        self.assertEqual([e["attributes"]["event_type"] for e in events], ["pan_swap"])

    def test_roll_errors_map_to_http_errors(self):
        missing = self.post(self.user, "/pans/generate", {}, session_key="nope")
        empty = self.post(self.user, "/pans/generate", {"numFill": 0, "numSauce": 0}, session_key="s1")
        no_key = self.post(self.user, "/pans/generate", {})

        self.assertEqual(missing.status_code, 404)
        self.assertEqual(empty.status_code, 400)
        self.assertEqual(no_key.status_code, 400)


if __name__ == "__main__":
    unittest.main()
