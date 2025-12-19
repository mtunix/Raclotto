from typing import Optional, List
from back.src.repository.base_repository import BaseRepository
from back.src.entity.level import Level
from back.src.driver.database import db


class LevelRepository(BaseRepository[Level]):
    """Repository for Level entities."""
    
    def __init__(self):
        super().__init__(Level)
    
    def by_experience(self, experience_points: int) -> Optional[Level]:
        """
        Get the highest level that the user has achieved based on experience points.
        
        :param experience_points: User's total experience points
        :return: Level instance or None if no level found
        """
        # Get the highest level where required_experience <= experience_points
        return db.session.query(Level)\
            .filter(Level.required_experience <= experience_points)\
            .order_by(Level.required_experience.desc())\
            .first()
    
    def all_ordered(self) -> List[Level]:
        """
        Get all levels ordered by required_experience ascending.
        
        :return: List of levels
        """
        return db.session.query(Level)\
            .order_by(Level.required_experience.asc())\
            .all()
    
    def next_level(self, current_level: Level) -> Optional[Level]:
        """
        Get the next level after the current level.
        
        :param current_level: Current level
        :return: Next level or None if at max level
        """
        return db.session.query(Level)\
            .filter(Level.required_experience > current_level.required_experience)\
            .order_by(Level.required_experience.asc())\
            .first()

