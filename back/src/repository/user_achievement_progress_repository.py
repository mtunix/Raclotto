from typing import Optional
from back.src.repository.base_repository import BaseRepository
from back.src.entity.user_achievement_progress import UserAchievementProgress
from back.src.driver.database import db


class UserAchievementProgressRepository(BaseRepository[UserAchievementProgress]):
    """Repository for UserAchievementProgress entities."""
    
    def __init__(self):
        super().__init__(UserAchievementProgress)
    
    def by_user_and_achievement(self, user_id: int, achievement_id: int) -> Optional[UserAchievementProgress]:
        """
        Get progress record for a user and achievement.
        
        :param user_id: User ID
        :param achievement_id: Achievement ID
        :return: Progress record or None if not found
        """
        return db.session.query(UserAchievementProgress).filter_by(
            user_id=user_id,
            achievement_id=achievement_id
        ).first()
    
    def create_or_update(self, user_id: int, achievement_id: int, progress_value: float) -> UserAchievementProgress:
        """
        Create or update progress record for a user and achievement.
        
        :param user_id: User ID
        :param achievement_id: Achievement ID
        :param progress_value: Progress value between 0.0 and 1.0
        :return: Progress record
        """
        # Clamp progress to valid range
        progress_value = max(0.0, min(1.0, progress_value))
        
        progress_record = self.by_user_and_achievement(user_id, achievement_id)
        
        if progress_record:
            progress_record.progress_value = progress_value
        else:
            progress_record = UserAchievementProgress(
                user_id=user_id,
                achievement_id=achievement_id,
                progress_value=progress_value
            )
            db.session.add(progress_record)
        
        db.session.flush()
        return progress_record

