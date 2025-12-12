from typing import Optional
from datetime import datetime, timedelta
from back.src.entity.event import Event
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.pan import Pan
from back.src.interactor.event_evaluator import EventEvaluator
from back.src.repository.pan_repository import PanRepository
from back.src.repository.user_repository import UserRepository
from back.src.repository.event_repository import EventRepository
from back.src.driver.database import db


class PanSwapEvaluator(EventEvaluator):
    """
    Evaluator for "Pan Swap" event.
    Triggers when two pans are created within 10 minutes of each other in the same session.
    Can only occur once per hour.
    """
    
    def __init__(self):
        self.pan_repository = PanRepository()
        self.user_repository = UserRepository()
        self.event_repository = EventRepository()
        self.time_window_minutes = 10
        self.cooldown_hours = 1
    
    def get_event_type(self) -> str:
        return "pan_swap"
    
    def evaluate(
        self,
        session: RaclottoSession,
        context: dict
    ) -> Optional[Event]:
        """
        Check if a pan swap event should be triggered.
        Expects context to contain 'pan' key with the newly created pan.
        
        :param session: The session
        :param context: Context dict with 'pan' key
        :return: Event if triggered, None otherwise
        """
        pan = context.get('pan')
        if not pan or not isinstance(pan, Pan):
            return None
        
        # Check if a pan_swap event has occurred in the last hour
        pan_timestamp = pan.timestamp if pan.timestamp else datetime.now()
        one_hour_ago = pan_timestamp - timedelta(hours=self.cooldown_hours)
        
        recent_events = db.session.query(Event).filter(
            Event.session_id == session.id,
            Event.event_type == self.get_event_type(),
            Event.created_at >= one_hour_ago
        ).all()
        
        if recent_events:
            # Event already occurred in the last hour, don't trigger again
            return None
        
        # Get all pans in the session
        session_pans = self.pan_repository.by_session(session.key)
        
        if len(session_pans) < 2:
            return None
        
        # Find pans created within the time window
        time_window_start = pan_timestamp - timedelta(minutes=self.time_window_minutes)
        time_window_end = pan_timestamp + timedelta(minutes=self.time_window_minutes)
        
        # Find other pans within the time window (excluding the current pan)
        nearby_pans = [
            p for p in session_pans
            if p.id != pan.id
            and p.timestamp
            and time_window_start <= p.timestamp <= time_window_end
        ]
        
        if not nearby_pans:
            return None
        
        # Get the closest pan (most recent within window)
        closest_pan = max(nearby_pans, key=lambda p: p.timestamp if p.timestamp else datetime.min)
        
        # Get user names
        pan_user = self.user_repository.by_id(pan.user_id)
        closest_pan_user = self.user_repository.by_id(closest_pan.user_id)
        
        if not pan_user or not closest_pan_user:
            return None
        
        # Create event message
        message = f"Swap your pans! {pan_user.name} and {closest_pan_user.name} created pans within {self.time_window_minutes} minutes of each other."
        
        # Create event data
        event_data = {
            "pan1_id": pan.id,
            "pan1_user_id": pan.user_id,
            "pan1_user_name": pan_user.name,
            "pan2_id": closest_pan.id,
            "pan2_user_id": closest_pan.user_id,
            "pan2_user_name": closest_pan_user.name,
            "time_window_minutes": self.time_window_minutes
        }
        
        # Create event
        event = Event(
            session_id=session.id,
            event_type=self.get_event_type(),
            message=message,
            data=event_data
        )
        
        return event

