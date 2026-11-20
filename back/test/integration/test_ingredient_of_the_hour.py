import random
from datetime import datetime, timedelta

from back.src.driver.database import db
from back.src.dto.event import IngredientOfTheHourDto
from back.src.entity.event import Event
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.interactor.events import Events
from back.src.interactor.ingredient_of_the_hour import EVENT_TYPE, IngredientOfTheHour
from back.src.interactor.levels import INGREDIENT_OF_THE_HOUR_BONUS, Levels
from back.src.interactor.pan_roll import PanRoll, RollOptions
from back.test.support import AppTest

FILL, SAUCE = IngredientType.FILL, IngredientType.SAUCE


class IngredientOfTheHourTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.session = self.make_session("s1", creator=self.ana)
        self.potato = self.make_ingredient(self.session, "Potato", FILL)
        self.onion = self.make_ingredient(self.session, "Onion", FILL)
        self.leek = self.make_ingredient(self.session, "Leek", FILL)
        self.pork = self.make_ingredient(self.session, "Pork", FILL, meat=True)
        self.aioli = self.make_ingredient(self.session, "Aioli", SAUCE)
        self.now = datetime(2026, 12, 24, 19, 0)

    def clock(self) -> datetime:
        return self.now

    def roller(self, seed: int = 0) -> PanRoll:
        return PanRoll(rng=random.Random(seed), name_pan=lambda taken: "p", events=Events(clock=self.clock))

    def pick(self, ingredient: Ingredient, minutes_ago: int = 0) -> None:
        db.session.add(
            Event(
                session_id=self.session.id,
                event_type=EVENT_TYPE,
                message="",
                data={"ingredient_id": ingredient.id, "ingredient_name": ingredient.name},
                created_at=self.now - timedelta(minutes=minutes_ago),
            )
        )
        db.session.commit()

    def current(self) -> Ingredient | None:
        pick = IngredientOfTheHour().current(self.session)
        return pick.ingredient if pick else None


class TestPicking(IngredientOfTheHourTest):
    def test_the_first_roll_picks_an_available_fill_and_announces_it(self):
        self.leek.available = False
        db.session.commit()

        outcome = self.roller().roll(self.ana, "s1", RollOptions(num_fill=1))

        [event] = [event for event in outcome.events if event.event_type == EVENT_TYPE]
        picked = self.current()
        assert picked is not None and event.data is not None
        self.assertIn(picked, [self.potato, self.onion, self.pork])
        self.assertEqual(event.data, {"ingredient_id": picked.id, "ingredient_name": picked.name})

    def test_it_stays_for_an_hour_then_the_next_roll_picks_another(self):
        roll = self.roller()
        roll.roll(self.ana, "s1", RollOptions(num_fill=1))
        first = self.current()

        self.now += timedelta(minutes=59)
        within = roll.roll(self.ana, "s1", RollOptions(num_fill=1))
        self.now += timedelta(minutes=2)
        after = roll.roll(self.ana, "s1", RollOptions(num_fill=1))

        self.assertNotIn(EVENT_TYPE, [event.event_type for event in within.events])
        self.assertIn(EVENT_TYPE, [event.event_type for event in after.events])
        self.assertNotEqual(self.current(), first)

    def test_one_that_ran_out_is_no_longer_current(self):
        self.pick(self.onion)
        self.onion.available = False
        db.session.commit()

        self.assertIsNone(self.current())

    def test_a_disabled_event_picks_none(self):
        Events().configure(EVENT_TYPE, enabled=False, frequency_minutes=None, session=self.session)

        self.roller().roll(self.ana, "s1", RollOptions(num_fill=1))

        self.assertIsNone(self.current())


class TestRollingWithIt(IngredientOfTheHourTest):
    def test_an_opted_in_user_gets_it_in_every_rolled_pan_in_place_of_a_fill(self):
        self.pick(self.onion)
        self.ana.add_ingredient_of_the_hour = True
        db.session.commit()
        roll = self.roller()

        for options, count in ((RollOptions(num_fill=2, num_sauce=1), 3), (RollOptions(total_columns=2), 2)):
            for _ in range(5):
                pan = roll.roll(self.ana, "s1", options).pan
                self.assertIn(self.onion, pan.ingredients)
                self.assertEqual(len(pan.ingredients), count)
                self.assertTrue(pan.ingredient_of_the_hour)

    def test_a_classic_roll_without_fills_gets_it_on_top(self):
        self.pick(self.onion)
        self.ana.add_ingredient_of_the_hour = True
        db.session.commit()

        pan = self.roller().roll(self.ana, "s1", RollOptions(num_fill=0, num_sauce=1)).pan

        self.assertEqual(sorted(i.name for i in pan.ingredients), ["Aioli", "Onion"])

    def test_not_when_the_diet_forbids_it(self):
        self.pick(self.pork)
        ben = self.make_user("ben", vegan=True)
        ben.add_ingredient_of_the_hour = True
        db.session.commit()

        pans = [self.roller(seed).roll(ben, "s1", RollOptions(num_fill=2)).pan for seed in range(5)]

        self.assertFalse(any(self.pork in pan.ingredients for pan in pans))

    def test_anyone_who_draws_it_earns_the_bonus(self):
        self.pick(self.onion)

        pans = [self.roller(seed).roll(self.ana, "s1", RollOptions(num_fill=1)).pan for seed in range(20)]

        lucky = [pan for pan in pans if self.onion in pan.ingredients]
        self.assertTrue(lucky)
        self.assertTrue(all(pan.ingredient_of_the_hour == (pan in lucky) for pan in pans))
        without = Levels().xp_for(pans[pans.index(lucky[0])])
        lucky[0].ingredient_of_the_hour = False
        self.assertEqual(without - Levels().xp_for(lucky[0]), INGREDIENT_OF_THE_HOUR_BONUS)

    def test_a_hand_picked_pan_earns_no_bonus(self):
        self.pick(self.onion)
        self.ana.add_ingredient_of_the_hour = True
        db.session.commit()

        pan = self.roller().roll(self.ana, "s1", RollOptions(ingredient_ids=[self.onion.id])).pan

        self.assertFalse(pan.ingredient_of_the_hour)


class TestRoutes(IngredientOfTheHourTest):
    def get(self, user=None, session_key: str = "s1"):
        return self.call("GET", "/events/ingredient-of-the-hour", user or self.ana, query={"session_key": session_key})

    def test_none_until_a_roll_picks_one(self):
        response = self.get()

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(
            IngredientOfTheHourDto.model_validate(response.json),
            IngredientOfTheHourDto(ingredient=None, chosen_at=None, bonus_xp=INGREDIENT_OF_THE_HOUR_BONUS),
        )

    def test_shows_the_pick_and_whether_the_diet_allows_it(self):
        self.pick(self.pork)
        vegan = self.make_user("ben", vegan=True)

        for user, applicable in ((self.ana, True), (vegan, False)):
            dto = IngredientOfTheHourDto.model_validate(self.get(user).json)
            assert dto.ingredient is not None
            self.assertEqual((dto.ingredient.name, dto.ingredient.applicable), ("Pork", applicable))

    def test_unknown_session_is_404(self):
        self.assertEqual(self.get(session_key="nope").status_code, 404)

    def test_users_opt_in_through_their_profile(self):
        response = self.call("PATCH", "/auth/me", self.ana, body={"add_ingredient_of_the_hour": True})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertTrue(response.json["add_ingredient_of_the_hour"])
        db.session.refresh(self.ana)
        self.assertTrue(self.ana.add_ingredient_of_the_hour)

    def test_rolled_pans_say_whether_they_had_it(self):
        self.pick(self.onion)
        self.ana.add_ingredient_of_the_hour = True
        db.session.commit()

        response = self.call("POST", "/pans/generate", self.ana, body={"num_fill": 1}, query={"session_key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertTrue(response.json["pan"]["ingredient_of_the_hour"])
