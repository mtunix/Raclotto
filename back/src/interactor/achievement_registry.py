from typing import Dict, Optional
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import AchievementEvaluator


class AchievementRegistry:
    """Registry for mapping achievements to their evaluators."""
    
    def __init__(self):
        self._evaluators: Dict[str, AchievementEvaluator] = {}
    
    def register_evaluator(self, achievement_title: str, evaluator: AchievementEvaluator):
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
    from back.src.entity.achievement import Achievement
    from back.src.driver.database import db
    from back.src.interactor.achievement_evaluators.placeholder_evaluator import PlaceholderEvaluator
    from back.src.interactor.achievement_evaluators.stack_overflow_evaluator import StackOverflowEvaluator
    from back.src.interactor.achievement_evaluators.first_blood_evaluator import FirstBloodEvaluator
    from back.src.interactor.achievement_evaluators.local_guide_evaluator import LocalGuideEvaluator
    from back.src.interactor.achievement_evaluators.king_of_the_sauce_evaluator import KingOfTheSauceEvaluator
    
    # Register specific evaluators
    _registry.register_evaluator("Stack Overflow!", StackOverflowEvaluator())
    _registry.register_evaluator("First Blood!", FirstBloodEvaluator())
    _registry.register_evaluator("Local Guide", LocalGuideEvaluator())
    _registry.register_evaluator("King of the Sauce", KingOfTheSauceEvaluator())
    
    # Get all achievements from database
    from back.src.repository.achievement_repository import AchievementRepository
    achievement_repository = AchievementRepository()
    achievements = achievement_repository.all()
    
    # Register placeholder evaluator for each achievement that doesn't have one
    placeholder = PlaceholderEvaluator()
    for achievement in achievements:
        if not _registry.has_evaluator(achievement):
            _registry.register_evaluator(achievement.title, placeholder)
