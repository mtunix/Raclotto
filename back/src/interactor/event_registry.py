from typing import Dict
from back.src.interactor.event_evaluator import EventEvaluator


class EventRegistry:
    """Registry for mapping event types to their evaluators."""
    
    def __init__(self) -> None:
        self._evaluators: Dict[str, EventEvaluator] = {}
    
    def register_evaluator(self, event_type: str, evaluator: EventEvaluator) -> None:
        """
        Register an evaluator for an event type.
        
        :param event_type: The event type
        :param evaluator: The evaluator instance
        """
        self._evaluators[event_type] = evaluator
    
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


def initialize_registry() -> None:
    """
    Initialize the registry with evaluators for events.
    This should be called during application startup.
    """
    from back.src.interactor.event_evaluators.pan_swap_evaluator import PanSwapEvaluator
    
    # Register event evaluators
    pan_swap_evaluator = PanSwapEvaluator()
    _registry.register_evaluator(pan_swap_evaluator.get_event_type(), pan_swap_evaluator)






