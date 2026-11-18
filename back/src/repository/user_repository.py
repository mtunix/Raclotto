from typing import Optional
from back.src.repository.base_repository import BaseRepository
from back.src.entity.user import User
from back.src.driver.database import db


class UserRepository(BaseRepository[User]):
    """Repository for User entities."""
    
    def __init__(self):
        super().__init__(User)
    
    def by_email(self, email: str) -> Optional[User]:
        """
        Get user by email.
        
        :param email: User email
        :return: User instance or None if not found
        """
        return db.session.query(User).filter_by(email=email).first()
    
    def by_name(self, name: str) -> Optional[User]:
        """
        Get user by name.
        
        :param name: User name
        :return: User instance or None if not found
        """
        return db.session.query(User).filter_by(name=name).first()
    
    def by_email_or_name(self, identifier: str) -> Optional[User]:
        """
        Get user by email or name.
        
        :param identifier: Email or name
        :return: User instance or None if not found
        """
        user = self.by_email(identifier)
        if user:
            return user
        return self.by_name(identifier)
    
    def get_unlocked_achievements(self, user_id: int) -> set:
        """
        Get set of achievement IDs unlocked by a user.
        
        :param user_id: User ID
        :return: Set of achievement IDs
        """
        from back.src.entity.user import user_achievements
        return {
            row[0] for row in db.session.query(user_achievements.c.achievement_id)
            .filter(user_achievements.c.user_id == user_id)
        }
    
    def get_users_in_session(self, session_id: int) -> set:
        """
        Get set of user IDs in a session.
        
        :param session_id: Session ID
        :return: Set of user IDs
        """
        from back.src.entity.user import user_sessions
        return {
            row[0] for row in db.session.query(user_sessions.c.user_id)
            .filter(user_sessions.c.session_id == session_id)
        }
    
    def get_users_with_achievement(self, achievement_id: int) -> set:
        """
        Get set of user IDs who have an achievement.
        
        :param achievement_id: Achievement ID
        :return: Set of user IDs
        """
        from back.src.entity.user import user_achievements
        return {
            row[0] for row in db.session.query(user_achievements.c.user_id)
            .filter(user_achievements.c.achievement_id == achievement_id)
        }