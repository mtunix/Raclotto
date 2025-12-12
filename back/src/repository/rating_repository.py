from typing import List, Optional
from sqlalchemy.exc import NoResultFound
from back.src.repository.base_repository import BaseRepository
from back.src.entity.rating import Rating
from back.src.entity.raclotto_session import RaclottoSession
from back.src.driver.database import db


class RatingRepository(BaseRepository[Rating]):
    """Repository for Rating entities."""
    
    def __init__(self):
        super().__init__(Rating)
    
    def by_pan(self, pan_id: int) -> List[Rating]:
        """
        Get all ratings for a pan.
        
        :param pan_id: Pan ID
        :return: List of ratings
        """
        return db.session.query(Rating).filter_by(pan_id=pan_id).all()
    
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
    
    def by_user(self, user_id: int) -> List[Rating]:
        """
        Get all ratings given by a user.
        
        :param user_id: User ID
        :return: List of ratings
        """
        return db.session.query(Rating).filter_by(user_id=user_id).all()
    
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
    
    def create_for_pan(self, rating_data: dict, pan_id: int, session_id: int) -> Rating:
        """
        Create a rating and associate it with a pan.
        
        :param rating_data: Dictionary with rating attributes (rating, user_id, etc.)
        :param pan_id: Pan ID
        :param session_id: Session ID
        :return: Created rating
        """
        from back.src.entity.pan import Pan
        
        pan = db.session.query(Pan).filter_by(id=pan_id).one()
        rating = Rating(**rating_data, pan_id=pan_id, session_id=session_id)
        db.session.add(rating)
        pan.ratings.append(rating)
        db.session.flush()
        return rating