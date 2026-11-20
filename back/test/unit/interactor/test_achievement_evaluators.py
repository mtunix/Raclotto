import unittest
from datetime import datetime, timedelta

from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.rating import Rating
from back.src.entity.user import User
from back.src.interactor.achievement_evaluator import AchievementEvaluator, Audience, EvaluationContext
from back.src.interactor.achievement_evaluators.biotonne_evaluator import BiotonneEvaluator
from back.src.interactor.achievement_evaluators.double_kill_evaluator import DoubleKillEvaluator
from back.src.interactor.achievement_evaluators.first_blood_evaluator import FirstBloodEvaluator
from back.src.interactor.achievement_evaluators.garbage_collector_evaluator import GarbageCollectorEvaluator
from back.src.interactor.achievement_evaluators.gotta_eat_em_all_evaluator import GottaEatEmAllEvaluator
from back.src.interactor.achievement_evaluators.japan_evaluator import JapanEvaluator
from back.src.interactor.achievement_evaluators.king_of_the_grill_evaluator import KingOfTheGrillEvaluator
from back.src.interactor.achievement_evaluators.king_of_the_sauce_evaluator import KingOfTheSauceEvaluator
from back.src.interactor.achievement_evaluators.last_pan_standing_evaluator import LastPanStandingEvaluator
from back.src.interactor.achievement_evaluators.local_host_evaluator import LocalHostEvaluator
from back.src.interactor.achievement_evaluators.pandler_evaluator import PandlerEvaluator
from back.src.interactor.achievement_evaluators.pantastic_evaluator import PantasticEvaluator
from back.src.interactor.achievement_evaluators.stack_overflow_evaluator import StackOverflowEvaluator
from back.src.interactor.achievement_evaluators.steakholder_evaluator import SteakholderEvaluator
from back.src.interactor.achievement_evaluators.survival_of_the_fittest_evaluator import (
    SurvivalOfTheFittestEvaluator,
)
from back.src.interactor.achievement_evaluators.vanilla_evaluator import VanillaEvaluator
from back.src.interactor.facts import (
    CatalogChanged,
    Fact,
    IngredientAdded,
    PanDeleted,
    PanRated,
    PanRolled,
    SessionClosed,
    SessionOpened,
)
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.session_repository import SessionRepository

NOON = datetime(2026, 11, 20, 12)
ANA = User(id=1, name="ana")
BEN = User(id=2, name="ben")
ACHIEVEMENT = Achievement(id=1, title="any")
SESSION = RaclottoSession(id=1, key="session")

_ids = iter(range(1, 10_000))


def ingredient(type_: IngredientType = IngredientType.FILL, id_: int | None = None, **flags: bool) -> Ingredient:
    return Ingredient(id=id_ or next(_ids), name="x", type=type_, **flags)


def pan(user: User, *ingredients: Ingredient, at: datetime = NOON, session_id: int = 1) -> Pan:
    return Pan(id=next(_ids), user_id=user.id, session_id=session_id, timestamp=at, ingredients=list(ingredients))


def context(*session_pans: Pan, user_pans: tuple[Pan, ...] = (), sessions_created: int = 0) -> EvaluationContext:
    return EvaluationContext(
        session=SESSION,
        user_pans=list(user_pans),
        session_pans=list(session_pans),
        user_ratings_count=0,
        user_sessions_created=sessions_created,
    )


def rated(p: Pan, *stars: float) -> Pan:
    p.ratings = [Rating(user_id=100 + i, pan_id=p.id, rating=s) for i, s in enumerate(stars)]
    return p


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

        for fact in (rolled(), deleted()):
            with self.subTest(type(fact).__name__):
                self.assertTrue(self.evaluator.judge(fact, ANA, ACHIEVEMENT, pans).unlocked)
                result = self.evaluator.judge(fact, BEN, ACHIEVEMENT, pans)
                self.assertEqual((result.unlocked, result.progress), (False, 0.5))
                self.assertTrue(self.evaluator.judge(fact, BEN, ACHIEVEMENT, tied).unlocked)
                self.assertFalse(self.evaluator.judge(fact, ANA, ACHIEVEMENT, context()).unlocked)

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

    def by_session(self, session_key: str, limit: int | None = None, offset: int = 0) -> list[Pan]:
        return list(self.pans)


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


class TestLocalHost(unittest.TestCase):
    evaluator = LocalHostEvaluator()

    def test_one_created_session_unlocks(self):
        for fact in (SessionOpened(SESSION, ANA), rolled()):
            with self.subTest(type(fact).__name__):
                one, three, none = (
                    self.evaluator.judge(fact, ANA, ACHIEVEMENT, context(sessions_created=n)) for n in (1, 3, 0)
                )
                self.assertTrue(one.unlocked)
                self.assertEqual(three.progress, 1.0)
                self.assertEqual((none.unlocked, none.progress), (False, 0.0))

    def test_progress_counts_the_created_sessions(self):
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context()), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(sessions_created=2)), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class TestFirstBlood(unittest.TestCase):
    evaluator = FirstBloodEvaluator()

    def test_the_first_pan_of_the_session_unlocks(self):
        first = pan(ANA)

        self.assertTrue(self.evaluator.evaluate(first, ANA, context(first)).unlocked)
        self.assertTrue(self.evaluator.evaluate(first, ANA, context()).unlocked)

    def test_a_pan_after_anyone_elses_does_not(self):
        bens = pan(BEN, at=NOON)
        later = pan(ANA, at=NOON + timedelta(seconds=1))
        same_time = pan(ANA, at=NOON)

        self.assertFalse(self.evaluator.evaluate(later, ANA, context(bens, later)).unlocked)
        self.assertTrue(self.evaluator.evaluate(same_time, ANA, context(bens, same_time)).unlocked)

    def test_progress_is_only_the_unlock(self):
        first = pan(ANA)

        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(first)), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class FakeIngredients(IngredientRepository):
    def __init__(self, *ingredients: Ingredient):
        self.ingredients = list(ingredients)

    def by_type(self, session_key: str, ingredient_type: IngredientType) -> list[Ingredient]:
        return [i for i in self.ingredients if i.type == ingredient_type]


class FakeSessions(SessionRepository):
    def __init__(self, *sessions: RaclottoSession):
        self.sessions = {s.id: s for s in sessions}

    def by_id(self, id: int) -> RaclottoSession | None:
        return self.sessions.get(id)


class TestGottaEatEmAll(unittest.TestCase):
    potato, onion = ingredient(), ingredient()
    sauce = ingredient(IngredientType.SAUCE)

    def evaluator(self, *pans: Pan, session: RaclottoSession = SESSION) -> GottaEatEmAllEvaluator:
        return GottaEatEmAllEvaluator(
            ingredients=FakeIngredients(self.potato, self.onion, self.sauce),
            sessions=FakeSessions(session),
            pans=FakePans(*pans),
        )

    def test_every_fill_of_the_session_unlocks_sauces_aside(self):
        evaluator = self.evaluator(pan(ANA, self.potato), pan(ANA, self.onion), pan(BEN, self.potato))

        self.assertTrue(evaluator.evaluate(pan(ANA), ANA, context()).unlocked)
        result = evaluator.evaluate(pan(BEN), BEN, context())
        self.assertEqual((result.unlocked, result.progress), (False, 0.5))

    def test_a_session_without_fills_unlocks_nothing(self):
        evaluator = GottaEatEmAllEvaluator(
            ingredients=FakeIngredients(self.sauce), sessions=FakeSessions(SESSION), pans=FakePans(pan(ANA, self.sauce))
        )

        result = evaluator.evaluate(pan(ANA), ANA, context())
        self.assertEqual((result.unlocked, result.progress), (False, 0.0))
        self.assertEqual(evaluator.calculate_progress(ANA, ACHIEVEMENT, context()), 0.0)

    def test_an_unknown_session_unlocks_nothing(self):
        evaluator = self.evaluator(pan(ANA, self.potato, self.onion), session=RaclottoSession(id=2, key="other"))

        self.assertFalse(evaluator.evaluate(pan(ANA), ANA, context()).unlocked)

    def test_progress_falls_when_a_fill_is_added_even_once_unlocked(self):
        evaluator = self.evaluator(pan(ANA, self.potato))

        self.assertEqual(evaluator.calculate_progress(ANA, ACHIEVEMENT, context()), 0.5)
        self.assertEqual(evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 0.5)
        all_eaten = self.evaluator(pan(ANA, self.potato, self.onion))
        self.assertEqual(all_eaten.calculate_progress(ANA, ACHIEVEMENT, context()), 1.0)


class TestBiotonne(unittest.TestCase):
    evaluator = BiotonneEvaluator()

    def test_five_vegan_pans_of_the_user_unlock(self):
        vegan = [pan(ANA, ingredient(vegan=True), ingredient(IngredientType.SAUCE, vegan=True)) for _ in range(4)]
        vegetarian = pan(ANA, ingredient(vegan=True), ingredient(vegetarian=True))
        others = (vegetarian, pan(ANA), pan(BEN, ingredient(vegan=True)))

        result = self.evaluator.evaluate(vegan[0], ANA, context(*vegan, *others))
        self.assertEqual((result.unlocked, result.progress), (False, 0.8))
        fifth = pan(ANA, ingredient(vegan=True))
        self.assertTrue(self.evaluator.evaluate(fifth, ANA, context(*vegan, *others, fifth)).unlocked)

    def test_progress_counts_the_vegan_pans(self):
        vegan = [pan(ANA, ingredient(vegan=True)) for _ in range(6)]

        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(*vegan[:2])), 0.4)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(*vegan)), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class TestSteakholder(unittest.TestCase):
    evaluator = SteakholderEvaluator()

    def test_five_pans_with_meat_of_the_user_unlock(self):
        meaty = [pan(ANA, ingredient(meat=True), ingredient(vegan=True)) for _ in range(4)]
        others = (pan(ANA, ingredient(fish=True)), pan(ANA), pan(BEN, ingredient(meat=True)))

        result = self.evaluator.evaluate(meaty[0], ANA, context(*meaty, *others))
        self.assertEqual((result.unlocked, result.progress), (False, 0.8))
        fifth = pan(ANA, ingredient(meat=True))
        self.assertTrue(self.evaluator.evaluate(fifth, ANA, context(*meaty, *others, fifth)).unlocked)

    def test_progress_counts_the_pans_with_meat(self):
        meaty = [pan(ANA, ingredient(meat=True)) for _ in range(6)]

        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(*meaty[:2])), 0.4)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(*meaty)), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class TestStackOverflow(unittest.TestCase):
    evaluator = StackOverflowEvaluator()

    def test_more_than_ten_ingredients_unlock(self):
        self.assertTrue(self.evaluator.evaluate(pan(ANA, *(ingredient() for _ in range(11))), ANA, context()).unlocked)
        self.assertFalse(self.evaluator.evaluate(pan(ANA, *(ingredient() for _ in range(10))), ANA, context()).unlocked)

    def test_progress_looks_at_all_the_users_pans(self):
        big = pan(ANA, *(ingredient() for _ in range(11)))
        small = pan(ANA, *(ingredient() for _ in range(10)))

        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(user_pans=(small, big))), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(user_pans=(small,))), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, context()), 1.0)


class TestLastPanStanding(unittest.TestCase):
    evaluator = LastPanStandingEvaluator()
    closed = SessionClosed(SESSION)

    def test_the_owner_of_the_latest_pan_unlocks_when_the_session_closes(self):
        pans = context(pan(ANA, at=NOON + timedelta(hours=1)), pan(BEN, at=NOON))

        self.assertTrue(self.evaluator.judge(self.closed, ANA, ACHIEVEMENT, pans).unlocked)
        result = self.evaluator.judge(self.closed, BEN, ACHIEVEMENT, pans)
        self.assertEqual((result.unlocked, result.progress), (False, 0.0))
        self.assertFalse(self.evaluator.judge(self.closed, ANA, ACHIEVEMENT, context()).unlocked)

    def test_progress_is_owning_the_latest_pan(self):
        pans = context(pan(ANA, at=NOON), pan(BEN, at=NOON + timedelta(hours=1)))

        self.assertEqual(self.evaluator.calculate_progress(BEN, ACHIEVEMENT, pans), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, pans), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, pans), 1.0)


class TestPantastic(unittest.TestCase):
    evaluator = PantasticEvaluator()

    def test_the_best_pan_with_two_ratings_unlocks_ties_included(self):
        best = rated(pan(ANA), 5, 4)
        tied = rated(pan(BEN), 4.5, 4.5)
        worse = rated(pan(BEN), 4, 4)
        better_but_once = rated(pan(BEN), 5)

        self.assertTrue(self.evaluator.evaluate(best, ANA, context(best, tied, worse, better_but_once)).unlocked)
        self.assertTrue(self.evaluator.evaluate(tied, BEN, context(best, tied, worse)).unlocked)
        result = self.evaluator.evaluate(worse, BEN, context(best, worse))
        self.assertEqual((result.unlocked, result.progress), (False, 0.0))

    def test_one_rating_is_not_enough(self):
        once = rated(pan(ANA), 5)

        self.assertFalse(self.evaluator.evaluate(once, ANA, context(once)).unlocked)

    def test_progress_looks_at_the_users_pans_in_the_session(self):
        anas = rated(pan(ANA), 3, 3)
        bens = rated(pan(BEN), 5, 5)
        pans = context(rated(pan(ANA), 5), anas, bens)

        self.assertEqual(self.evaluator.calculate_progress(BEN, ACHIEVEMENT, pans), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, pans), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, pans), 1.0)


class TestSurvivalOfTheFittest(unittest.TestCase):
    evaluator = SurvivalOfTheFittestEvaluator()

    def test_the_worst_pan_with_two_ratings_unlocks_ties_included(self):
        worst = rated(pan(ANA), 1, 2)
        tied = rated(pan(BEN), 1.5, 1.5)
        better = rated(pan(BEN), 4, 4)
        worse_but_once = rated(pan(BEN), 0.5)

        self.assertTrue(self.evaluator.evaluate(worst, ANA, context(worst, tied, better, worse_but_once)).unlocked)
        self.assertTrue(self.evaluator.evaluate(tied, BEN, context(worst, tied, better)).unlocked)
        result = self.evaluator.evaluate(better, BEN, context(worst, better))
        self.assertEqual((result.unlocked, result.progress), (False, 0.0))

    def test_one_rating_is_not_enough(self):
        once = rated(pan(ANA), 1)

        self.assertFalse(self.evaluator.evaluate(once, ANA, context(once)).unlocked)

    def test_progress_looks_at_the_users_pans_in_the_session(self):
        anas = rated(pan(ANA), 3, 3)
        bens = rated(pan(BEN), 1, 1)
        pans = context(rated(pan(ANA), 0.5), anas, bens)

        self.assertEqual(self.evaluator.calculate_progress(BEN, ACHIEVEMENT, pans), 1.0)
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, pans), 0.0)
        self.assertEqual(self.evaluator.calculate_progress(unlocked_for(ANA.id), ACHIEVEMENT, pans), 1.0)


class TestGarbageCollectorEdges(unittest.TestCase):
    evaluator = GarbageCollectorEvaluator()

    def test_a_pan_no_later_than_the_previous_makes_no_progress(self):
        first = pan(ANA, at=NOON)
        same_time = pan(ANA, at=NOON)

        result = self.evaluator.evaluate(same_time, ANA, context(first, same_time))
        self.assertEqual((result.unlocked, result.progress), (False, 0.0))
        self.assertEqual(self.evaluator.calculate_progress(ANA, ACHIEVEMENT, context(first, same_time)), 0.0)


def rolled() -> PanRolled:
    return PanRolled(pan(ANA), ANA, SESSION)


def deleted() -> PanDeleted:
    return PanDeleted(pan_id=next(_ids), author=ANA, session=SESSION)


def rated_fact() -> PanRated:
    p = pan(BEN)
    return PanRated(Rating(user_id=ANA.id, pan_id=p.id, rating=3), p, ANA, SESSION)


class TestDeclarations(unittest.TestCase):
    """Which facts each evaluator reacts to, whom it judges, and whether the achievement can be lost."""

    def assert_declares(
        self, evaluator: AchievementEvaluator, fact: Fact, audience: Audience, revocable: bool = False
    ) -> None:
        self.assertEqual(evaluator.reacts_to, (type(fact),))
        self.assertEqual(evaluator.audience(fact), audience)
        self.assertEqual(evaluator.revocable, revocable)

    def test_rolling_judges_the_roller_for_good(self):
        for evaluator in (
            FirstBloodEvaluator(),
            GottaEatEmAllEvaluator(),
            BiotonneEvaluator(),
            SteakholderEvaluator(),
            StackOverflowEvaluator(),
            GarbageCollectorEvaluator(),
        ):
            with self.subTest(type(evaluator).__name__):
                self.assert_declares(evaluator, rolled(), "actor")

    def test_opening_a_session_or_rolling_judges_the_actor_for_good(self):
        evaluator = LocalHostEvaluator()

        self.assertEqual(evaluator.reacts_to, (SessionOpened, PanRolled))
        self.assertEqual(evaluator.audience(SessionOpened(SESSION, ANA)), "actor")
        self.assertEqual(evaluator.audience(rolled()), "actor")
        self.assertFalse(evaluator.revocable)

    def test_ratings_judge_the_pans_owner_for_good(self):
        for evaluator in (PantasticEvaluator(), SurvivalOfTheFittestEvaluator()):
            with self.subTest(type(evaluator).__name__):
                self.assert_declares(evaluator, rated_fact(), "pan_owner")

    def test_rolling_or_deleting_a_pan_judges_every_member_again_for_the_most_pans(self):
        evaluator = KingOfTheGrillEvaluator()

        self.assertEqual(evaluator.reacts_to, (PanRolled, PanDeleted))
        self.assertEqual({evaluator.audience(rolled()), evaluator.audience(deleted())}, {"session_members"})
        self.assertTrue(evaluator.revocable)

    def test_rolling_or_deleting_a_pan_judges_its_author_again_for_every_sauce(self):
        evaluator = KingOfTheSauceEvaluator()

        self.assertEqual(evaluator.reacts_to, (PanRolled, PanDeleted, IngredientAdded, CatalogChanged))
        self.assertEqual({evaluator.audience(rolled()), evaluator.audience(deleted())}, {"actor"})
        self.assertEqual(evaluator.audience(CatalogChanged(SESSION)), "session_members")
        self.assertTrue(evaluator.revocable)

    def test_closing_judges_the_last_pans_owner_for_good(self):
        self.assert_declares(LastPanStandingEvaluator(), SessionClosed(SESSION), "last_pan_owner")
