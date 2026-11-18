from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)
from back.src.repository.pan_repository import PanRepository


class PandlerEvaluator(AchievementEvaluator):
    """
    Evaluator for "Pandler" achievement.
    Description: "Nimm an 2 Raclottos innerhalb von 24h teil"
    (Participate in 2 raclottos within 24 hours)
    
    This achievement is global. It checks if the user has had a pan in two different
    sessions within a 24-hour time frame.
    """
    
    REQUIRED_SESSIONS_COUNT = 2
    TIME_WINDOW_HOURS = 24
    
    def __init__(self):
        self.pan_repository = PanRepository()
    
    def _get_user_pans_by_session(self, user: User) -> List[Tuple[int, datetime]]:
        """
        Get the session IDs and timestamps of the earliest pan in each session for the user.
        
        :param user: The user
        :return: List of (session_id, earliest_pan_timestamp) tuples, sorted by time
        """
        # Get all pans for the user
        pans = self.pan_repository.by_user(user.id)
        
        # Group pans by session_id and get the earliest timestamp for each session
        session_earliest_pan: dict[int, datetime] = {}
        for pan in pans:
            session_id = pan.session_id
            pan_timestamp = pan.timestamp
            
            # Keep track of the earliest pan timestamp for each session
            if session_id not in session_earliest_pan or pan_timestamp < session_earliest_pan[session_id]:
                session_earliest_pan[session_id] = pan_timestamp
        
        # Convert to list of tuples and sort by timestamp
        result = [(session_id, timestamp) for session_id, timestamp in session_earliest_pan.items()]
        result.sort(key=lambda x: x[1])
        return result
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has had a pan in two different sessions within 24 hours.
        This is evaluated when a pan is created.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if user has pans in 2 different sessions within 24h
        """
        # Get all sessions where the user has pans (session_id, earliest_pan_timestamp)
        session_pans = self._get_user_pans_by_session(user)
        
        if len(session_pans) < self.REQUIRED_SESSIONS_COUNT:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Check if any two DIFFERENT sessions have pans within 24 hours
        time_window = timedelta(hours=self.TIME_WINDOW_HOURS)
        unlocked = False
        
        # Check all pairs of sessions (must be different sessions)
        for i in range(len(session_pans)):
            for j in range(i + 1, len(session_pans)):
                session_id_i, pan_time_i = session_pans[i]
                session_id_j, pan_time_j = session_pans[j]
                
                # Must be different sessions
                if session_id_i == session_id_j:
                    continue
                
                # Check if pans were created within 24 hours
                time_diff = abs(pan_time_j - pan_time_i)
                if time_diff <= time_window:
                    unlocked = True
                    break
            
            if unlocked:
                break
        
        # Progress is binary: either 0.0 or 1.0
        progress = 1.0 if unlocked else 0.0
        
        return EvaluationResult(unlocked=unlocked, progress=progress)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress - binary achievement, either unlocked or not.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value (0.0 or 1.0)
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        # Get all sessions where the user has pans (session_id, earliest_pan_timestamp)
        session_pans = self._get_user_pans_by_session(user)
        
        if len(session_pans) < self.REQUIRED_SESSIONS_COUNT:
            return 0.0
        
        # Check if any two DIFFERENT sessions have pans within 24 hours
        time_window = timedelta(hours=self.TIME_WINDOW_HOURS)
        
        for i in range(len(session_pans)):
            for j in range(i + 1, len(session_pans)):
                session_id_i, pan_time_i = session_pans[i]
                session_id_j, pan_time_j = session_pans[j]
                
                # Must be different sessions
                if session_id_i == session_id_j:
                    continue
                
                # Check if pans were created within 24 hours
                time_diff = abs(pan_time_j - pan_time_i)
                if time_diff <= time_window:
                    return 1.0
        
        return 0.0

