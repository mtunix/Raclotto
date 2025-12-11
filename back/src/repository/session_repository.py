from typing import Optional, List
import uuid
from datetime import datetime
from back.src.repository.base_repository import BaseRepository
from back.src.entity.raclotto_session import RaclottoSession
from back.src.driver.database import db


class SessionRepository(BaseRepository[RaclottoSession]):
    """Repository for RaclottoSession entities."""
    
    def __init__(self):
        super().__init__(RaclottoSession)
    
    def by_key(self, key: str) -> Optional[RaclottoSession]:
        """
        Get session by key.
        
        :param key: Session key
        :return: Session instance or None if not found
        """
        return db.session.query(RaclottoSession).filter_by(key=key).first()
    
    def active_sessions(self) -> List[RaclottoSession]:
        """
        Get all active sessions.
        
        :return: List of active sessions
        """
        return db.session.query(RaclottoSession).filter_by(active=True).all()
    
    def close_session(self, key: str) -> Optional[RaclottoSession]:
        """
        Close a session by setting active to False.
        
        :param key: Session key
        :return: Updated session or None if not found
        """
        session = self.by_key(key)
        if not session:
            return None
        
        session.active = False
        db.session.flush()
        return session
    
    def create_with_key(self, name: str, user_id: Optional[int] = None) -> RaclottoSession:
        """
        Create a new session with generated key.
        
        :param name: Session name
        :param user_id: Optional user ID who created the session
        :return: Created session
        """
        session = RaclottoSession(
            key=str(uuid.uuid4()),
            name=name,
            timestamp=datetime.now(),
            active=True,
            created_by_user_id=user_id
        )
        db.session.add(session)
        db.session.flush()
        return session
    
    def validate(self, key: str) -> bool:
        """
        Check if a session exists with the given key.
        
        :param key: Session key
        :return: True if session exists, False otherwise
        """
        return self.by_key(key) is not None
    
    def active_by_key(self, key: str) -> Optional[RaclottoSession]:
        """
        Get active session by key.
        
        :param key: Session key
        :return: Active session or None if not found or not active
        """
        session = self.by_key(key)
        if session and session.active:
            return session
        return None
    
    def by_creator(self, user_id: int) -> List[RaclottoSession]:
        """
        Get all sessions created by a user.
        
        :param user_id: User ID
        :return: List of sessions created by the user
        """
        return db.session.query(RaclottoSession).filter_by(created_by_user_id=user_id).all()