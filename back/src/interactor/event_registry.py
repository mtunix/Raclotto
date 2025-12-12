from typing import Dict, Optional
from back.src.interactor.event_evaluator import EventEvaluator


class EventRegistry:
    """Registry for mapping event types to their evaluators."""
    
    def __init__(self):
        self._evaluators: Dict[str, EventEvaluator] = {}
    
    def register_evaluator(self, event_type: str, evaluator: EventEvaluator):
        """
        Register an evaluator for an event type.
        
        :param event_type: The event type
        :param evaluator: The evaluator instance
        """
        self._evaluators[event_type] = evaluator
    
    def get_evaluator(self, event_type: str) -> Optional[EventEvaluator]:
        """
        Get the evaluator for an event type.
        
        :param event_type: The event type
        :return: The evaluator instance or None if not registered
        """
        return self._evaluators.get(event_type)
    
    def has_evaluator(self, event_type: str) -> bool:
        """
        Check if an event type has a registered evaluator.
        
        :param event_type: The event type
        :return: True if evaluator is registered, False otherwise
        """
        return event_type in self._evaluators
    
    def get_all_evaluators(self) -> Dict[str, EventEvaluator]:
        """
        Get all registered evaluators.
        
        :return: Dictionary mapping event types to evaluators
        """
        return self._evaluators.copy()


# Global registry instance
_registry = EventRegistry()


def get_registry() -> EventRegistry:
    """Get the global event registry instance."""
    return _registry


def initialize_registry():
    """
    Initialize the registry with evaluators for events.
    This should be called during application startup.
    """
    from back.src.interactor.event_evaluators.pan_swap_evaluator import PanSwapEvaluator
    
    # Register event evaluators
    pan_swap_evaluator = PanSwapEvaluator()
    _registry.register_evaluator(pan_swap_evaluator.get_event_type(), pan_swap_evaluator)

