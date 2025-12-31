from typing import Dict, Optional

from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import AchievementEvaluator


class AchievementRegistry:
    """Registry for mapping achievements to their evaluators."""

    def __init__(self):
        self._evaluators: Dict[str, AchievementEvaluator] = {}

    def register_evaluator(
        self, achievement_title: str, evaluator: AchievementEvaluator
    ):
        """
        Register an evaluator for an achievement.

        :param achievement_title: The title of the achievement
        :param evaluator: The evaluator instance
        """
        self._evaluators[achievement_title] = evaluator

    def get_evaluator(self, achievement: Achievement) -> Optional[AchievementEvaluator]:
        """
        Get the evaluator for an achievement.

        :param achievement: The achievement entity
        :return: The evaluator instance or None if not registered
        """
        return self._evaluators.get(achievement.title)

    def has_evaluator(self, achievement: Achievement) -> bool:
        """
        Check if an achievement has a registered evaluator.

        :param achievement: The achievement entity
        :return: True if evaluator is registered, False otherwise
        """
        return achievement.title in self._evaluators


# Global registry instance
_registry = AchievementRegistry()


def get_registry() -> AchievementRegistry:
    """Get the global achievement registry instance."""
    return _registry


def initialize_registry():
    """
    Initialize the registry with evaluators for achievements.
    This should be called after achievements are loaded from the database.
    """
    from back.src.driver.database import db
    from back.src.entity.achievement import Achievement
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
    _registry.register_evaluator("Stack Overflow!", StackOverflowEvaluator())
    _registry.register_evaluator("First Blood!", FirstBloodEvaluator())
    _registry.register_evaluator("Local Guide", LocalGuideEvaluator())
    _registry.register_evaluator("Local Host", LocalHostEvaluator())
    _registry.register_evaluator("King of the Sauce", KingOfTheSauceEvaluator())
    _registry.register_evaluator("King of the Grill", KingOfTheGrillEvaluator())
    _registry.register_evaluator("Garbage Collector", GarbageCollectorEvaluator())
    _registry.register_evaluator("Double Kill!", DoubleKillEvaluator())
    _registry.register_evaluator("Connoisseur", ConnoisseurEvaluator())
    _registry.register_evaluator("Last Pan standing", LastPanStandingEvaluator())
    _registry.register_evaluator("Vanilla", VanillaEvaluator())
    _registry.register_evaluator("Pandler", PandlerEvaluator())
    _registry.register_evaluator(
        "Survival of the Fittest", SurvivalOfTheFittestEvaluator()
    )
    _registry.register_evaluator("Pantastic", PantasticEvaluator())
    _registry.register_evaluator("Steakholder", SteakholderEvaluator())
    _registry.register_evaluator("Biotonne", BiotonneEvaluator())
    _registry.register_evaluator("Gotta eat'em all!", GottaEatEmAllEvaluator())
    _registry.register_evaluator("JaPan", JapanEvaluator())

    # Get all achievements from database
    from back.src.repository.achievement_repository import AchievementRepository

    achievement_repository = AchievementRepository()
    achievements = achievement_repository.all()

    # Register placeholder evaluator for each achievement that doesn't have one
    placeholder = PlaceholderEvaluator()
    for achievement in achievements:
        if not _registry.has_evaluator(achievement):
            _registry.register_evaluator(achievement.title, placeholder)
