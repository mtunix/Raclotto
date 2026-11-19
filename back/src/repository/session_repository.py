import uuid
from datetime import datetime

from back.src.driver.database import db
from back.src.entity.raclotto_session import RaclottoSession
from back.src.repository.base_repository import BaseRepository


class SessionRepository(BaseRepository[RaclottoSession]):
    """Repository for RaclottoSession entities."""

    def __init__(self) -> None:
        super().__init__(RaclottoSession)

    def by_key(self, key: str) -> RaclottoSession | None:
        """
        Get session by key.

        :param key: Session key
        :return: Session instance or None if not found
        """
        return db.session.query(RaclottoSession).filter_by(key=key).first()

    def active_sessions(self) -> list[RaclottoSession]:
        """
        Get all active sessions.

        :return: List of active sessions
        """
        return db.session.query(RaclottoSession).filter_by(active=True).all()

    def all_sessions(self) -> list[RaclottoSession]:
        """
        Get all sessions (active and inactive).

        :return: List of all sessions
        """
        return db.session.query(RaclottoSession).all()

    def create_with_key(self, name: str, user_id: int | None = None) -> RaclottoSession:
        """
        Create a new session with generated key.

        :param name: Session name
        :param user_id: Optional user ID who created the session
        :return: Created session
        """
        session = RaclottoSession(
            key=str(uuid.uuid4()), name=name, timestamp=datetime.now(), active=True, created_by_user_id=user_id
        )
        db.session.add(session)
        db.session.flush()
        return session

    def by_creator(self, user_id: int) -> list[RaclottoSession]:
        """
        Get all sessions created by a user.

        :param user_id: User ID
        :return: List of sessions created by the user
        """
        return db.session.query(RaclottoSession).filter_by(created_by_user_id=user_id).all()
