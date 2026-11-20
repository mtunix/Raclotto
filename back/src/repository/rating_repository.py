from sqlalchemy import func
from sqlalchemy.exc import NoResultFound

from back.src.driver.database import db
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.rating import Rating
from back.src.repository.base_repository import BaseRepository


class RatingRepository(BaseRepository[Rating]):
    """Repository for Rating entities."""

    def __init__(self) -> None:
        super().__init__(Rating)

    def by_session(self, session_key: str) -> list[Rating]:
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
            return db.session.query(Rating).filter_by(session_id=session.id).all()
        except NoResultFound:
            return []

    def by_user_and_pan(self, user_id: int, pan_id: int) -> Rating | None:
        return db.session.query(Rating).filter_by(user_id=user_id, pan_id=pan_id).first()

    def count_by_user(self, user_id: int) -> int:
        return db.session.query(Rating).filter_by(user_id=user_id).count()

    def average_for_pans(self, pan_ids: list[int]) -> float | None:
        """The average of every rating the pans received; None without ratings."""
        if not pan_ids:
            return None
        average = db.session.query(func.avg(Rating.rating)).filter(Rating.pan_id.in_(pan_ids)).scalar()
        return float(average) if average is not None else None
