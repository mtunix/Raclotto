from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.exc import NoResultFound
from back.src.repository.base_repository import BaseRepository
from back.src.entity.rating import Rating
from back.src.entity.raclotto_session import RaclottoSession
from back.src.driver.database import db


class RatingRepository(BaseRepository[Rating]):
    """Repository for Rating entities."""
    
    def __init__(self) -> None:
        super().__init__(Rating)
    
    def by_session(self, session_key: str) -> List[Rating]:
        """
        Get all ratings for a session.
        
        :param session_key: Session key
        :return: List of ratings
        """
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
            return db.session.query(Rating).filter_by(session_id=session.id).all()
        except NoResultFound:
            return []
    
    def by_user_and_pan(self, user_id: int, pan_id: int) -> Optional[Rating]:
        """
        Get a rating by user and pan.
        
        :param user_id: User ID
        :param pan_id: Pan ID
        :return: Rating or None if not found
        """
        return db.session.query(Rating).filter_by(user_id=user_id, pan_id=pan_id).first()
    
    def count_by_user(self, user_id: int) -> int:
        """
        Count ratings given by a user.
        
        :param user_id: User ID
        :return: Count of ratings
        """
        return db.session.query(Rating).filter_by(user_id=user_id).count()

    def average_for_pans(self, pan_ids: List[int]) -> Optional[float]:
        """The average of every rating the pans received; None without ratings."""
        if not pan_ids:
            return None
        average = db.session.query(func.avg(Rating.rating)).filter(Rating.pan_id.in_(pan_ids)).scalar()
        return float(average) if average is not None else None
