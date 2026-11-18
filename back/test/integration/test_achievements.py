import random

from back.src.driver.database import db
from back.src.entity.ingredient import IngredientType
from back.src.entity.rating import Rating
from back.src.entity.user_achievement_progress import UserAchievementProgress
from back.src.interactor.achievements import (
    Achievements,
    CatalogChanged,
    IngredientAdded,
    PanRated,
    SessionClosed,
)
from back.src.interactor.pan_roll import PanRoll, RollOptions
from back.test.support import AppTest

FILL, SAUCE = IngredientType.FILL, IngredientType.SAUCE


def titles(achievements):
    return {a.title for a in achievements}


def held(user):
    db.session.refresh(user)
    return {a.title for a in user.achievements}


class TestAchievements(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.ben = self.make_user("ben", meat=True)
        self.session = self.make_session("s1", creator=self.ana)
        self.potato = self.make_ingredient(self.session, "Potato", FILL)
        self.aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.roll = PanRoll(rng=random.Random(7), name_pan=lambda: "p")
        self.achievements = Achievements()

    def roll_pan(self, user, **options):
        options = options or {"num_fill": 1, "num_sauce": 1}
        return self.roll.roll(user, "s1", RollOptions(**options))

    def test_last_pan_standing_waits_for_the_session_to_close(self):
        first = self.roll_pan(self.ana)
        self.roll_pan(self.ben)

        self.assertNotIn("Last Pan standing", titles(first.achievements))
        self.assertNotIn("Last Pan standing", held(self.ben))

        changes = self.achievements.record(SessionClosed(session=self.session))
        db.session.commit()

        self.assertEqual(titles(changes.unlocked_for(self.ben.id)), {"Last Pan standing"})
        self.assertNotIn("Last Pan standing", held(self.ana))

    def test_king_of_the_grill_moves_to_whoever_leads(self):
        self.roll_pan(self.ana)
        self.assertIn("King of the Grill", held(self.ana))

        self.roll_pan(self.ben)
        outcome = self.roll_pan(self.ben)

        self.assertIn("King of the Grill", titles(outcome.achievements) | held(self.ben))
        self.assertNotIn("King of the Grill", held(self.ana))

    def test_connoisseur_comes_from_adding_a_new_ingredient_not_from_rolling(self):
        outcome = self.roll_pan(self.ana)
        self.assertNotIn("Connoisseur", titles(outcome.achievements))

        existing = self.make_ingredient(self.make_session("s2"), " potato ", FILL)
        duplicate = self.achievements.record(
            IngredientAdded(ingredient=existing, user=self.ana, session=self.session)
        )
        self.assertEqual(duplicate.unlocked_for(self.ana.id), [])

        truffle = self.make_ingredient(self.session, "Truffle", FILL)
        unique = self.achievements.record(
            IngredientAdded(ingredient=truffle, user=self.ana, session=self.session)
        )
        self.assertEqual(titles(unique.unlocked_for(self.ana.id)), {"Connoisseur"})

    def test_rating_judges_the_rater_and_the_pan_owner_separately(self):
        many = [self.make_ingredient(self.session, f"F{i}", FILL) for i in range(11)]
        big_pan = self.make_pan(self.ben, self.session, many)

        rating = Rating(rating=5, pan_id=big_pan.id, user_id=self.ana.id, session_id=self.session.id)
        db.session.add(rating)
        db.session.commit()
        changes = self.achievements.record(
            PanRated(rating=rating, pan=big_pan, rater=self.ana, session=self.session)
        )

        # Rating someone's 11-ingredient pan must not count as stacking it yourself.
        self.assertNotIn("Stack Overflow!", titles(changes.unlocked_for(self.ana.id)))
        progress = (
            db.session.query(UserAchievementProgress)
            .filter_by(user_id=self.ana.id)
            .all()
        )
        self.assertTrue(progress, "Local Guide progress is stored for the rater")

    def test_king_of_the_sauce_is_lost_when_a_new_sauce_appears(self):
        self.roll_pan(self.ana)
        self.assertIn("King of the Sauce", held(self.ana))

        mayo = self.make_ingredient(self.session, "Mayo", SAUCE, vegetarian=True)
        changes = self.achievements.record(
            IngredientAdded(ingredient=mayo, user=self.ben, session=self.session)
        )
        db.session.commit()

        self.assertEqual(titles(changes.revoked_for(self.ana.id)), {"King of the Sauce"})
        self.assertNotIn("King of the Sauce", held(self.ana))

    def test_removing_the_unused_sauce_restores_king_of_the_sauce(self):
        mayo = self.make_ingredient(self.session, "Mayo", SAUCE, vegetarian=True)
        self.roll_pan(self.ana, ingredient_ids=[self.potato.id, self.aioli.id])
        self.assertNotIn("King of the Sauce", held(self.ana))

        mayo.available = False
        db.session.commit()
        changes = self.achievements.record(CatalogChanged(session=self.session))

        self.assertEqual(titles(changes.unlocked_for(self.ana.id)), {"King of the Sauce"})

    def test_statuses_do_not_write(self):
        self.roll_pan(self.ana)
        before = db.session.query(UserAchievementProgress).count()

        statuses = self.achievements.statuses(self.ana)

        self.assertEqual(db.session.query(UserAchievementProgress).count(), before)
        by_title = {s.achievement.title: s for s in statuses}
        self.assertTrue(by_title["First Blood!"].unlocked)
        self.assertFalse(by_title["Last Pan standing"].unlocked)

    def test_achievements_route_lists_status_and_progress(self):
        self.roll_pan(self.ana)
        response = self.client.get("/api/achievements", headers=self.auth(self.ana))

        self.assertEqual(response.status_code, 200, response.json)
        first_blood = next(
            a for a in response.json["data"] if a["attributes"]["title"] == "First Blood!"
        )
        self.assertTrue(first_blood["attributes"]["unlocked"])
