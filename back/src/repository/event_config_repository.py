from typing import List, Optional
from sqlalchemy import and_, or_
from back.src.repository.base_repository import BaseRepository
from back.src.entity.event_config import EventConfig
from back.src.driver.database import db


class EventConfigRepository(BaseRepository[EventConfig]):
    """Repository for EventConfig entities."""
    
    def __init__(self):
        super().__init__(EventConfig)
    
    def get_config(self, event_type: str, session_id: Optional[int] = None) -> Optional[EventConfig]:
        """
        Get event configuration, checking session override first, then global default.
        
        :param event_type: Event type
        :param session_id: Optional session ID for session-specific override
        :return: EventConfig or None
        """
        # First check for session-specific override
        if session_id is not None:
            session_config = db.session.query(EventConfig).filter(
                and_(
                    EventConfig.event_type == event_type,
                    EventConfig.session_id == session_id
                )
            ).first()
            if session_config:
                return session_config
        
        # Fall back to global default
        global_config = db.session.query(EventConfig).filter(
            and_(
                EventConfig.event_type == event_type,
                EventConfig.session_id.is_(None)
            )
        ).first()
        
        return global_config
    
    def get_all_configs(self, session_id: Optional[int] = None) -> List[EventConfig]:
        """
        Get all event configurations, including both global defaults and session overrides.
        
        :param session_id: Optional session ID to filter session-specific configs
        :return: List of EventConfigs
        """
        if session_id is not None:
            return db.session.query(EventConfig).filter(
                or_(
                    EventConfig.session_id == session_id,
                    EventConfig.session_id.is_(None)
                )
            ).all()
        else:
            return db.session.query(EventConfig).all()
    
    def create_or_update(self, event_type: str, enabled: bool, frequency_minutes: Optional[int] = None, session_id: Optional[int] = None) -> EventConfig:
        """
        Create or update event configuration.
        
        :param event_type: Event type
        :param enabled: Whether event is enabled
        :param frequency_minutes: Optional frequency in minutes
        :param session_id: Optional session ID for session-specific config
        :return: Created or updated EventConfig
        """
        # Check if config already exists
        existing = self.get_config(event_type, session_id)
        
        if existing:
            # Update existing config
            existing.enabled = enabled
            if frequency_minutes is not None:
                existing.frequency_minutes = frequency_minutes
            db.session.flush()
            return existing
        else:
            # Create new config
            config = EventConfig(
                event_type=event_type,
                session_id=session_id,
                enabled=enabled,
                frequency_minutes=frequency_minutes
            )
            db.session.add(config)
            db.session.flush()
            return config




