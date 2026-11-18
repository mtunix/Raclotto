from typing import Optional
from back.src.repository.base_repository import BaseRepository
from back.src.entity.achievement import Achievement
from back.src.driver.database import db


class AchievementRepository(BaseRepository[Achievement]):
    """Repository for Achievement entities (public read-only)."""
    
    def __init__(self):
        super().__init__(Achievement)
    
    def by_title(self, title: str) -> Optional[Achievement]:
        """
        Find achievement by title.
        
        :param title: Achievement title
        :return: Achievement instance or None if not found
        """
        return db.session.query(Achievement).filter_by(title=title).first()
