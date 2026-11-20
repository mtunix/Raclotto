import random

from back.src.driver.database import db
from back.src.entity.event import Event
from back.src.entity.ingredient import IngredientType
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.interactor.achievements import AchievementChanges, Achievements
from back.src.interactor.facts import Fact, PanDeleted
from back.src.interactor.pan_roll import PanRoll, RollOptions
from back.src.interactor.pans import Pans
from back.test.support import AppTest

FILL, SAUCE = IngredientType.FILL, IngredientType.SAUCE


class Recording(Achievements):
    def __init__(self) -> None:
        super().__init__()
        self.facts: list[Fact] = []

    def record(self, fact: Fact) -> AchievementChanges:
        self.facts.append(fact)
        return super().record(fact)


def held(user: User) -> set[str | None]:
    db.session.refresh(user)
    return {a.title for a in user.achievements}


class PansTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.ben = self.make_user("ben", meat=True)
        self.session = self.make_session("s1", creator=self.ana)
        self.potato = self.make_ingredient(self.session, "Potato", FILL)
        self.aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.achievements = Recording()
        self.pans = Pans(achievements=self.achievements)
        self.roll = PanRoll(rng=random.Random(7), name_pan=lambda: "p")

    def roll_pan(self, user: User, *ingredients) -> Pan:
        ids = [i.id for i in ingredients or (self.potato,)]
        pan = self.roll.roll(user, "s1", RollOptions(ingredient_ids=ids)).pan
        db.session.commit()
        return pan

    def delete(self, pan: Pan) -> None:
        self.pans.delete(pan)
        db.session.commit()

    def test_rename(self):
        pan = self.make_pan(self.ana, self.session, [self.potato])

        self.pans.rename(pan, "Lunch")
        db.session.commit()
        db.session.expire_all()

        self.assertEqual(db.session.get_one(Pan, pan.id).name, "Lunch")

    def test_delete_reports_the_pan_its_author_and_session(self):
        pan = self.make_pan(self.ana, self.session, [self.potato])
        pan_id = pan.id

        self.delete(pan)

        self.assertIsNone(db.session.get(Pan, pan_id))
        self.assertEqual(self.achievements.facts, [PanDeleted(pan_id=pan_id, author=self.ana, session=self.session)])

    def test_the_author_keeps_the_xp_the_pan_earned(self):
        pan = self.roll_pan(self.ana)
        db.session.refresh(self.ana)
        earned, level = self.ana.experience_points, self.ana.level_id
        self.assertGreater(earned, 0)

        self.delete(pan)

        db.session.refresh(self.ana)
        self.assertEqual((self.ana.experience_points, self.ana.level_id), (earned, level))

    def test_king_of_the_grill_moves_when_the_leader_deletes_pans(self):
        first, second = self.roll_pan(self.ana), self.roll_pan(self.ana)
        self.roll_pan(self.ben)
        self.assertIn("King of the Grill", held(self.ana))
        self.assertNotIn("King of the Grill", held(self.ben))

        self.delete(first)
        self.assertEqual(("King of the Grill" in held(self.ana), "King of the Grill" in held(self.ben)), (True, True))

        self.delete(second)
        self.assertNotIn("King of the Grill", held(self.ana))
        self.assertIn("King of the Grill", held(self.ben))

    def test_king_of_the_sauce_is_lost_with_the_only_pan_that_had_the_sauce(self):
        sauced = self.roll_pan(self.ana, self.potato, self.aioli)
        self.roll_pan(self.ana, self.potato)
        self.assertIn("King of the Sauce", held(self.ana))

        self.delete(sauced)

        self.assertNotIn("King of the Sauce", held(self.ana))

    def test_achievements_that_cannot_be_lost_stay(self):
        pan = self.roll_pan(self.ana)
        self.assertIn("First Blood!", held(self.ana))

        self.delete(pan)

        self.assertIn("First Blood!", held(self.ana))

    def test_an_event_that_named_the_pan_stays_listed(self):
        pan = self.roll_pan(self.ana)
        self.roll_pan(self.ben)
        [swap] = db.session.query(Event).all()
        self.assertEqual(swap.data and swap.data["pan2_id"], pan.id)

        self.delete(pan)

        listed = self.call("GET", "/events", self.ben, query={"session_key": "s1"})
        self.assertEqual(listed.status_code, 200, listed.json)
        self.assertEqual([e["id"] for e in listed.json], [swap.id])
