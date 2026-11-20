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
        return db.session.query(RaclottoSession).filter_by(key=key).first()

    def active_sessions(self) -> list[RaclottoSession]:
        return db.session.query(RaclottoSession).filter_by(active=True).all()

    def all_sessions(self) -> list[RaclottoSession]:
        return db.session.query(RaclottoSession).all()

    def create_with_key(self, name: str, user_id: int | None = None) -> RaclottoSession:
        session = RaclottoSession(
            key=str(uuid.uuid4()), name=name, timestamp=datetime.now(), active=True, created_by_user_id=user_id
        )
        db.session.add(session)
        db.session.flush()
        return session

    def by_creator(self, user_id: int) -> list[RaclottoSession]:
        return db.session.query(RaclottoSession).filter_by(created_by_user_id=user_id).all()
