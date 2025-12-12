from typing import List, Optional
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload
from wonderwords import RandomWord
from back.src.repository.base_repository import BaseRepository
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.ingredient import Ingredient, GenerationParameters
from back.src.driver.database import db


class PanRepository(BaseRepository[Pan]):
    """Repository for Pan entities."""
    
    def __init__(self):
        super().__init__(Pan)
    
    def by_session(self, session_key: str) -> List[Pan]:
        """
        Get all pans for a session.
        
        :param session_key: Session key
        :return: List of pans
        """
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
            return db.session.query(Pan).filter_by(session_id=session.id).all()
        except NoResultFound:
            return []
    
    def by_user(self, user_id: int) -> List[Pan]:
        """
        Get all pans for a user.
        
        :param user_id: User ID
        :return: List of pans
        """
        return db.session.query(Pan).filter_by(user_id=user_id).all()
    
    def by_id_with_relations(self, id: int) -> Optional[Pan]:
        """
        Get pan by ID with ratings and ingredients relations loaded.
        
        :param id: Pan ID
        :return: Pan instance with relations loaded or None if not found
        """
        try:
            return db.session.query(Pan)\
                .options(joinedload(Pan.ratings), joinedload(Pan.ingredients))\
                .filter_by(id=id).one()
        except NoResultFound:
            return None
    
    def find_n_best(self, session_key: Optional[str] = None, n: Optional[int] = None) -> List[Pan]:
        """
        Find best rated pans, optionally filtered by session and limited by count.
        
        :param session_key: Optional session key to filter by
        :param n: Optional limit on number of results
        :return: List of pans ordered by rating (descending)
        """
        query = db.session.query(Pan)
        
        if session_key:
            try:
                session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
                query = query.filter(Pan.session_id == session.id)
            except NoResultFound:
                return []
        
        query = query.order_by(Pan.rating.desc())
        
        if n:
            query = query.limit(n)
        
        return query.all()
    
    def get_recent_pans(self, session_key: Optional[str] = None, limit: int = 10) -> List[Pan]:
        """
        Get the most recent pans, optionally filtered by session and limited by count.
        
        :param session_key: Optional session key to filter by
        :param limit: Maximum number of results to return (default: 10)
        :return: List of pans ordered by timestamp (descending, most recent first)
        """
        query = db.session.query(Pan)
        
        if session_key:
            try:
                session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
                query = query.filter(Pan.session_id == session.id)
            except NoResultFound:
                return []
        
        query = query.order_by(Pan.timestamp.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def generate(
        self,
        ingredients: List[Ingredient],
        session_id: int,
        user_id: int,
        name: Optional[str] = None
    ) -> Pan:
        """
        Create a pan with generated or provided name.
        
        :param ingredients: List of ingredient instances
        :param session_id: Session ID
        :param user_id: User ID
        :param name: Optional pan name (if not provided, generates one)
        :return: Created pan
        """
        if not name:
            r = RandomWord()
            name = f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan"
        
        pan = Pan(
            name=name,
            ingredients=ingredients,
            user_id=user_id,
            session_id=session_id
        )
        db.session.add(pan)
        db.session.commit()
        return pan
