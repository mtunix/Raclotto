from typing import List, Optional
from back.src.entity.event import Event
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.event_config import EventConfig
from back.src.interactor.event_registry import get_registry
from back.src.repository.event_repository import EventRepository
from back.src.repository.event_config_repository import EventConfigRepository
from back.src.driver.database import db


class EventService:
    """Service for managing events."""
    
    def __init__(self):
        self.event_repository = EventRepository()
        self.config_repository = EventConfigRepository()
        self.registry = get_registry()
    
    def get_event_config(self, event_type: str, session_id: Optional[int] = None) -> Optional[EventConfig]:
        """
        Get event configuration, checking session override first, then global default.
        
        :param event_type: Event type
        :param session_id: Optional session ID
        :return: EventConfig or None
        """
        return self.config_repository.get_config(event_type, session_id)
    
    def is_event_enabled(self, event_type: str, session_id: Optional[int] = None) -> bool:
        """
        Check if an event type is enabled.
        
        :param event_type: Event type
        :param session_id: Optional session ID
        :return: True if enabled, False otherwise
        """
        config = self.get_event_config(event_type, session_id)
        if config:
            return config.enabled
        # Default to enabled if no config exists
        return True
    
    def evaluate_events_for_session(self, session: RaclottoSession, context: dict) -> List[Event]:
        """
        Evaluate all enabled events for a session.
        
        :param session: The session
        :param context: Context information (e.g., newly created pan)
        :return: List of triggered events
        """
        triggered_events = []
        
        # Get all evaluators
        evaluators = self.registry.get_all_evaluators()
        
        for event_type, evaluator in evaluators.items():
            # Check if event is enabled
            if not self.is_event_enabled(event_type, session.id):
                continue
            
            # Evaluate event
            try:
                event = evaluator.evaluate(session, context)
                if event:
                    # Save event to database
                    db.session.add(event)
                    db.session.flush()
                    triggered_events.append(event)
            except Exception as e:
                # Log error but continue with other evaluators
                import logging
                logging.error(f"Error evaluating event {event_type}: {e}")
                continue
        
        return triggered_events
    
    def get_pending_events(self, session_key: str, user_id: int) -> List[Event]:
        """
        Get pending events for a session that haven't been dismissed by the user.
        
        :param session_key: Session key
        :param user_id: User ID
        :return: List of pending events
        """
        return self.event_repository.get_pending_events_by_session_key(session_key, user_id)
    
    def dismiss_event(self, event_id: int, user_id: int) -> bool:
        """
        Dismiss an event for a user.
        
        :param event_id: Event ID
        :param user_id: User ID
        :return: True if dismissed, False otherwise
        """
        return self.event_repository.dismiss_event_for_user(event_id, user_id)
    
    def get_all_configs(self, session_id: Optional[int] = None) -> List[EventConfig]:
        """
        Get all event configurations.
        
        :param session_id: Optional session ID
        :return: List of EventConfigs
        """
        return self.config_repository.get_all_configs(session_id)
    
    def create_or_update_config(
        self,
        event_type: str,
        enabled: bool,
        frequency_minutes: Optional[int] = None,
        session_id: Optional[int] = None
    ) -> EventConfig:
        """
        Create or update event configuration.
        
        :param event_type: Event type
        :param enabled: Whether event is enabled
        :param frequency_minutes: Optional frequency in minutes
        :param session_id: Optional session ID for session-specific config
        :return: Created or updated EventConfig
        """
        return self.config_repository.create_or_update(
            event_type, enabled, frequency_minutes, session_id
        )






