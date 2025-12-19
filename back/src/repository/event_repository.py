from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from back.src.repository.base_repository import BaseRepository
from back.src.entity.event import Event
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import user_event_dismissals
from back.src.driver.database import db


class EventRepository(BaseRepository[Event]):
    """Repository for Event entities."""
    
    def __init__(self):
        super().__init__(Event)
    
    def by_session(self, session_id: int) -> List[Event]:
        """
        Get all events for a session.
        
        :param session_id: Session ID
        :return: List of events
        """
        return db.session.query(Event).filter_by(session_id=session_id).order_by(Event.created_at.desc()).all()
    
    def by_session_key(self, session_key: str) -> List[Event]:
        """
        Get all events for a session by session key.
        
        :param session_key: Session key
        :return: List of events
        """
        session = db.session.query(RaclottoSession).filter_by(key=session_key).first()
        if not session:
            return []
        return self.by_session(session.id)
    
    def get_pending_events(self, session_id: int, user_id: int) -> List[Event]:
        """
        Get events that haven't been dismissed by the user.
        
        :param session_id: Session ID
        :param user_id: User ID
        :return: List of pending events
        """
        # Get all events for the session
        all_events = db.session.query(Event).filter_by(session_id=session_id).all()
        
        # Get dismissed event IDs for this user
        dismissed_event_ids = db.session.query(user_event_dismissals.c.event_id).filter(
            user_event_dismissals.c.user_id == user_id
        ).all()
        dismissed_ids = {row[0] for row in dismissed_event_ids}
        
        # Filter out dismissed events
        pending_events = [event for event in all_events if event.id not in dismissed_ids]
        
        # Sort by created_at descending
        pending_events.sort(key=lambda e: e.created_at if e.created_at else datetime.min, reverse=True)
        
        return pending_events
    
    def get_pending_events_by_session_key(self, session_key: str, user_id: int) -> List[Event]:
        """
        Get pending events by session key.
        
        :param session_key: Session key
        :param user_id: User ID
        :return: List of pending events
        """
        session = db.session.query(RaclottoSession).filter_by(key=session_key).first()
        if not session:
            return []
        return self.get_pending_events(session.id, user_id)
    
    def dismiss_event_for_user(self, event_id: int, user_id: int) -> bool:
        """
        Mark an event as dismissed for a user.
        
        :param event_id: Event ID
        :param user_id: User ID
        :return: True if dismissed, False if already dismissed or event not found
        """
        # Check if event exists
        event = self.by_id(event_id)
        if not event:
            return False
        
        # Check if already dismissed
        existing = db.session.query(user_event_dismissals).filter(
            and_(
                user_event_dismissals.c.user_id == user_id,
                user_event_dismissals.c.event_id == event_id
            )
        ).first()
        
        if existing:
            return False
        
        # Add dismissal
        db.session.execute(
            user_event_dismissals.insert().values(
                user_id=user_id,
                event_id=event_id
            )
        )
        db.session.flush()
        return True






