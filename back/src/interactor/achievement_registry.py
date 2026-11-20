from back.src.entity.achievement import Achievement, AchievementKey
from back.src.interactor.achievement_evaluator import AchievementEvaluator


class AchievementRegistry:
    """Registry for mapping achievements to their evaluators."""

    def __init__(self) -> None:
        self._evaluators: dict[str, AchievementEvaluator] = {}

    def register_evaluator(self, key: str, evaluator: AchievementEvaluator) -> None:
        """Register the evaluator of the achievement with ``key``."""
        self._evaluators[key] = evaluator

    @property
    def evaluators(self) -> dict[str, AchievementEvaluator]:
        """Achievement key -> evaluator."""
        return self._evaluators

    def has_evaluator(self, achievement: Achievement) -> bool:
        return achievement.key in self._evaluators


# Global registry instance
_registry = AchievementRegistry()


def get_registry() -> AchievementRegistry:
    """Get the global achievement registry instance."""
    return _registry


def initialize_registry() -> None:
    """
    Initialize the registry with evaluators for achievements.
    This should be called after achievements are loaded from the database.
    """
    from back.src.interactor.achievement_evaluators.biotonne_evaluator import (
        BiotonneEvaluator,
    )
    from back.src.interactor.achievement_evaluators.connoisseur_evaluator import (
        ConnoisseurEvaluator,
    )
    from back.src.interactor.achievement_evaluators.double_kill_evaluator import (
        DoubleKillEvaluator,
    )
    from back.src.interactor.achievement_evaluators.first_blood_evaluator import (
        FirstBloodEvaluator,
    )
    from back.src.interactor.achievement_evaluators.garbage_collector_evaluator import (
        GarbageCollectorEvaluator,
    )
    from back.src.interactor.achievement_evaluators.gotta_eat_em_all_evaluator import (
        GottaEatEmAllEvaluator,
    )
    from back.src.interactor.achievement_evaluators.japan_evaluator import (
        JapanEvaluator,
    )
    from back.src.interactor.achievement_evaluators.king_of_the_grill_evaluator import (
        KingOfTheGrillEvaluator,
    )
    from back.src.interactor.achievement_evaluators.king_of_the_sauce_evaluator import (
        KingOfTheSauceEvaluator,
    )
    from back.src.interactor.achievement_evaluators.last_pan_standing_evaluator import (
        LastPanStandingEvaluator,
    )
    from back.src.interactor.achievement_evaluators.local_guide_evaluator import (
        LocalGuideEvaluator,
    )
    from back.src.interactor.achievement_evaluators.local_host_evaluator import (
        LocalHostEvaluator,
    )
    from back.src.interactor.achievement_evaluators.pandler_evaluator import (
        PandlerEvaluator,
    )
    from back.src.interactor.achievement_evaluators.pantastic_evaluator import (
        PantasticEvaluator,
    )
    from back.src.interactor.achievement_evaluators.placeholder_evaluator import (
        PlaceholderEvaluator,
    )
    from back.src.interactor.achievement_evaluators.stack_overflow_evaluator import (
        StackOverflowEvaluator,
    )
    from back.src.interactor.achievement_evaluators.steakholder_evaluator import (
        SteakholderEvaluator,
    )
    from back.src.interactor.achievement_evaluators.survival_of_the_fittest_evaluator import (
        SurvivalOfTheFittestEvaluator,
    )
    from back.src.interactor.achievement_evaluators.vanilla_evaluator import (
        VanillaEvaluator,
    )

    # Register specific evaluators
    _registry.register_evaluator(AchievementKey.stack_overflow, StackOverflowEvaluator())
    _registry.register_evaluator(AchievementKey.first_blood, FirstBloodEvaluator())
    _registry.register_evaluator(AchievementKey.local_guide, LocalGuideEvaluator())
    _registry.register_evaluator(AchievementKey.local_host, LocalHostEvaluator())
    _registry.register_evaluator(AchievementKey.king_of_the_sauce, KingOfTheSauceEvaluator())
    _registry.register_evaluator(AchievementKey.king_of_the_grill, KingOfTheGrillEvaluator())
    _registry.register_evaluator(AchievementKey.garbage_collector, GarbageCollectorEvaluator())
    _registry.register_evaluator(AchievementKey.double_kill, DoubleKillEvaluator())
    _registry.register_evaluator(AchievementKey.connoisseur, ConnoisseurEvaluator())
    _registry.register_evaluator(AchievementKey.last_pan_standing, LastPanStandingEvaluator())
    _registry.register_evaluator(AchievementKey.vanilla, VanillaEvaluator())
    _registry.register_evaluator(AchievementKey.pandler, PandlerEvaluator())
    _registry.register_evaluator(AchievementKey.survival_of_the_fittest, SurvivalOfTheFittestEvaluator())
    _registry.register_evaluator(AchievementKey.pantastic, PantasticEvaluator())
    _registry.register_evaluator(AchievementKey.steakholder, SteakholderEvaluator())
    _registry.register_evaluator(AchievementKey.biotonne, BiotonneEvaluator())
    _registry.register_evaluator(AchievementKey.gotta_eat_em_all, GottaEatEmAllEvaluator())
    _registry.register_evaluator(AchievementKey.japan, JapanEvaluator())

    # Get all achievements from database
    from back.src.repository.achievement_repository import AchievementRepository

    achievement_repository = AchievementRepository()
    achievements = achievement_repository.all()

    # Register placeholder evaluator for each achievement that doesn't have one
    placeholder = PlaceholderEvaluator()
    for achievement in achievements:
        if achievement.key is not None and not _registry.has_evaluator(achievement):
            _registry.register_evaluator(achievement.key, placeholder)
