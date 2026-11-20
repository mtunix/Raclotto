import unittest
from datetime import datetime, timedelta

from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import EvaluationContext
from back.src.interactor.achievement_evaluators.double_kill_evaluator import DoubleKillEvaluator
from back.src.interactor.achievement_evaluators.garbage_collector_evaluator import GarbageCollectorEvaluator
from back.src.interactor.achievement_evaluators.japan_evaluator import JapanEvaluator
from back.src.interactor.achievement_evaluators.king_of_the_grill_evaluator import KingOfTheGrillEvaluator
from back.src.interactor.achievement_evaluators.pandler_evaluator import PandlerEvaluator
from back.src.interactor.achievement_evaluators.vanilla_evaluator import VanillaEvaluator
from back.src.repository.pan_repository import PanRepository

NOON = datetime(2026, 11, 20, 12)
ANA = User(id=1, name="ana")
BEN = User(id=2, name="ben")
ACHIEVEMENT = Achievement(id=1, title="any")

_ids = iter(range(1, 10_000))


def ingredient(type_: IngredientType = IngredientType.FILL, id_: int | None = None, **flags: bool) -> Ingredient:
    return Ingredient(id=id_ or next(_ids), name="x", type=type_, **flags)


def pan(user: User, *ingredients: Ingredient, at: datetime = NOON, session_id: int = 1) -> Pan:
    return Pan(id=next(_ids), user_id=user.id, session_id=session_id, timestamp=at, ingredients=list(ingredients))


def context(*session_pans: Pan) -> EvaluationContext:
    return EvaluationContext(
        session=RaclottoSession(id=1),
        user_pans=[],
        session_pans=list(session_pans),
        user_ratings_count=0,
        user_sessions_created=0,
    )


def unlocked_for(user_id: int) -> User:
    user = User(id=user_id, name=f"u{user_id}")
    user.achievements.append(ACHIEVEMENT)
    return user


class TestVanilla(unittest.TestCase):
    evaluator = VanillaEvaluator()

    def test_one_fill_unlocks_whatever_the_sauces(self):
        single = pan(ANA, ingredient(), ingredient(IngredientType.SAUCE))
        double = pan(ANA, ingredient(), ingredient())

        self.assertTrue(self.evaluator.evaluate(single, ANA, context(single)).unlocked)
        self.assertFalse(self.evaluator.evaluate(double, ANA, context(double)).unlocked)

    def test_progress_looks_at_the_users_pans_in_the_session(self):
        bens_single = pan(BEN, ingredient())
        anas_double = pan(ANA, ingredient(), ingredient())

        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(bens_single, anas_double)), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(BEN, ACHIEVEMENT, context(bens_single, anas_double)), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class TestJapan(unittest.TestCase):
    evaluator = JapanEvaluator()

    def test_only_fish_fills_unlock(self):
        fish = pan(ANA, ingredient(fish=True), ingredient(IngredientType.SAUCE, vegan=True))
        mixed = pan(ANA, ingredient(fish=True), ingredient(meat=True))
        sauce_only = pan(ANA, ingredient(IngredientType.SAUCE, fish=True))

        self.assertTrue(self.evaluator.evaluate(fish, ANA, context()).unlocked)
        self.assertFalse(self.evaluator.evaluate(mixed, ANA, context()).unlocked)
        self.assertFalse(self.evaluator.evaluate(sauce_only, ANA, context()).unlocked)
        self.assertFalse(self.evaluator.evaluate(pan(ANA), ANA, context()).unlocked)

    def test_progress_looks_at_the_users_pans_in_the_session(self):
        fish = pan(BEN, ingredient(fish=True))

        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(fish)), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(BEN, ACHIEVEMENT, context(fish)), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class TestGarbageCollector(unittest.TestCase):
    evaluator = GarbageCollectorEvaluator()

    def test_three_hours_after_the_users_last_pan_unlocks(self):
        first = pan(ANA, at=NOON)
        bens = pan(BEN, at=NOON + timedelta(hours=2))
        late = pan(ANA, at=NOON + timedelta(hours=3))
        early = pan(ANA, at=NOON + timedelta(hours=1, minutes=30))

        self.assertTrue(self.evaluator.evaluate(late, ANA, context(first, bens, late)).unlocked)
        result = self.evaluator.evaluate(early, ANA, context(first, bens, early))
        self.assertEqual((result.unlocked, result.progress), (False, 0.5))

    def test_the_first_pan_does_not_count(self):
        first = pan(ANA)

        self.assertEqual(self.evaluator.evaluate(first, ANA, context(first)).progress, 0.0)

    def test_progress_is_the_last_gap_against_three_hours(self):
        pans = (pan(ANA, at=NOON), pan(ANA, at=NOON + timedelta(hours=1)), pan(ANA, at=NOON + timedelta(hours=2)))

        self.assertAlmostEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(*pans)) or 0, 1 / 3)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(pans[0])), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class TestDoubleKill(unittest.TestCase):
    evaluator = DoubleKillEvaluator()

    def test_the_same_ingredients_as_the_users_last_pan_unlock(self):
        potato, cheese = ingredient(), ingredient()
        first = pan(ANA, potato, cheese, at=NOON)
        bens = pan(BEN, ingredient(), at=NOON + timedelta(minutes=5))
        same = pan(ANA, cheese, potato, at=NOON + timedelta(minutes=10))
        other = pan(ANA, potato, at=NOON + timedelta(minutes=10))

        self.assertTrue(self.evaluator.evaluate(same, ANA, context(first, bens, same)).unlocked)
        self.assertFalse(self.evaluator.evaluate(other, ANA, context(first, bens, other)).unlocked)
        self.assertFalse(self.evaluator.evaluate(first, ANA, context(first)).unlocked)

    def test_progress_compares_the_users_two_latest_pans(self):
        potato = ingredient()
        older = pan(ANA, ingredient(), at=NOON)
        twin_a = pan(ANA, potato, at=NOON + timedelta(minutes=1))
        twin_b = pan(ANA, potato, at=NOON + timedelta(minutes=2))

        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(older, twin_a, twin_b)), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(older, twin_a)), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(older)), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class TestKingOfTheGrill(unittest.TestCase):
    evaluator = KingOfTheGrillEvaluator()

    def test_the_most_pans_in_the_session_unlock_ties_included(self):
        pans = context(pan(ANA), pan(ANA), pan(BEN))
        tied = context(pan(ANA), pan(BEN))

        self.assertTrue(self.evaluator.evaluate(pan(ANA), ANA, pans).unlocked)
        result = self.evaluator.evaluate(pan(BEN), BEN, pans)
        self.assertEqual((result.unlocked, result.progress), (False, 0.5))
        self.assertTrue(self.evaluator.evaluate(pan(BEN), BEN, tied).unlocked)
        self.assertFalse(self.evaluator.evaluate(pan(ANA), ANA, context()).unlocked)

    def test_progress_is_the_users_pans_against_the_most(self):
        pans = context(pan(ANA), pan(ANA), pan(ANA), pan(ANA), pan(BEN))

        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, pans), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(BEN.id), ACHIEVEMENT, pans), 0.25)
        self.assertEqual(self.evaluator.calculate_progress(BEN, ACHIEVEMENT, context()), 0.0)


class FakePans(PanRepository):
    def __init__(self, *pans: Pan):
        self.pans = list(pans)

    def by_user(self, user_id: int, limit: int | None = None, offset: int = 0) -> list[Pan]:
        return [p for p in self.pans if p.user_id == user_id]


class TestPandler(unittest.TestCase):
    def evaluator(self, *pans: Pan) -> PandlerEvaluator:
        return PandlerEvaluator(pans=FakePans(*pans))

    def test_two_sessions_within_a_day_unlock(self):
        evaluator = self.evaluator(
            pan(ANA, session_id=1, at=NOON),
            pan(ANA, session_id=1, at=NOON + timedelta(hours=30)),
            pan(ANA, session_id=2, at=NOON + timedelta(hours=23)),
            pan(BEN, session_id=1, at=NOON),
            pan(BEN, session_id=2, at=NOON + timedelta(hours=25)),
        )

        self.assertTrue(evaluator.evaluate(pan(ANA), ANA, context()).unlocked)
        self.assertFalse(evaluator.evaluate(pan(BEN), BEN, context()).unlocked)
        self.assertEqual(evaluator.calculate_progress(ANA, ACHIEVEMENT, context()), 1.0)
        self.assertEqual(evaluator.calculate_progress(BEN, ACHIEVEMENT, context()), 0.0)

    def test_the_earliest_pan_of_each_session_counts(self):
        evaluator = self.evaluator(
            pan(ANA, session_id=1, at=NOON),
            pan(ANA, session_id=1, at=NOON + timedelta(hours=40)),
            pan(ANA, session_id=2, at=NOON + timedelta(hours=41)),
        )

        self.assertFalse(evaluator.evaluate(pan(ANA), ANA, context()).unlocked)

    def test_one_session_is_not_enough(self):
        evaluator = self.evaluator(pan(ANA, session_id=1), pan(ANA, session_id=1))

        self.assertFalse(evaluator.evaluate(pan(ANA), ANA, context()).unlocked)
        self.assertEqual(evaluator.calculate_progress(ANA, ACHIEVEMENT, context()), 0.0)
        self.assertEqual(evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)
