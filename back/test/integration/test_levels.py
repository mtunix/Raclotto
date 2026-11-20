from back.src.driver.database import db
from back.src.driver.seed_data import LEVELS
from back.src.entity.level import Level
from back.src.interactor.levels import Levels
from back.src.repository.level_repository import LevelRepository
from back.test.support import AppTest


class TestLevels(AppTest):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("ana")
        self.session = self.make_session("s1", creator=self.user)
        self.count = 0

    def pan(self, plain: int = 0, *special: dict, rolled_preparation_type=False, rolled_cheese=False):
        ingredients = [self.ingredient() for _ in range(plain)] + [self.ingredient(**flags) for flags in special]
        pan = self.make_pan(self.user, self.session, ingredients)
        pan.rolled_preparation_type = rolled_preparation_type
        pan.rolled_cheese = rolled_cheese
        return pan

    def ingredient(self, **flags):
        self.count += 1
        return self.make_ingredient(self.session, f"Ingredient {self.count}", **flags)

    def xp(self, pan) -> int:
        return Levels().award(self.user, pan).xp_gained

    def test_each_ingredient_earns_more_the_fuller_the_pan(self):
        for count, per_ingredient in ((1, 5), (4, 5), (5, 7), (6, 9), (7, 9), (8, 11), (10, 11), (11, 13)):
            with self.subTest(count=count):
                self.assertEqual(self.xp(self.pan(count)), count * per_ingredient + 10)

    def test_the_highest_combination_multiplier_applies(self):
        base = 3 * 5 + 10
        for special, multiplier in (
            (({"wildcard": True},), 1.5),
            (({"wildcard": True}, {"spicy": 2}), 1.7),
            (({"spicy": 3}, {"sweet": True}), 1.25),
            (({"spicy": 1}, {"sweet": True}), 1.0),
            (({"spicy": 2},), 1.0),
        ):
            with self.subTest(special=special):
                self.assertEqual(self.xp(self.pan(3 - len(special), *special)), int(base * multiplier))

    def test_rolling_the_preparation_type_and_cheese_multiply_on_top(self):
        base = 3 * 5 + 10
        self.assertEqual(self.xp(self.pan(3, rolled_preparation_type=True)), int(base * 1.1))
        self.assertEqual(self.xp(self.pan(3, rolled_cheese=True)), int(base * 1.2))
        self.assertEqual(
            self.xp(self.pan(2, {"wildcard": True}, rolled_preparation_type=True, rolled_cheese=True)),
            int(base * 1.5 * 1.1 * 1.2),
        )

    def test_an_empty_pan_earns_nothing(self):
        self.assertEqual(self.xp(self.pan()), 0)

    def test_awarding_adds_the_xp_and_stores_the_level_it_reaches(self):
        self.user.experience_points = 95
        db.session.commit()

        reward = Levels().award(self.user, self.pan(1))

        self.assertEqual((reward.xp_before, reward.xp_after), (95, 110))
        assert reward.previous_level is not None and reward.level is not None
        self.assertEqual((reward.previous_level.required_experience, reward.level.required_experience), (0, 100))
        self.assertTrue(reward.leveled_up)
        self.assertEqual((self.user.experience_points, self.user.level_id), (110, reward.level.id))

    def test_new_users_start_at_the_lowest_level(self):
        self.assertEqual(Levels().starting(), LevelRepository().all_ordered()[0])


class TestLevelSeeding(AppTest):
    def test_seeding_again_brings_a_levels_required_experience_back_to_the_seed(self):
        seed = LEVELS[1]
        level = db.session.query(Level).filter_by(name=seed.name).one()
        level.required_experience = 1
        db.session.commit()

        self.app.init_levels()

        db.session.expire_all()
        self.assertEqual(db.session.get_one(Level, level.id).required_experience, seed.required_experience)
