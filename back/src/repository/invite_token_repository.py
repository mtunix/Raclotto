from typing import List, Optional
from back.src.repository.base_repository import BaseRepository
from back.src.entity.invite_token import InviteToken
from back.src.driver.database import db


class InviteTokenRepository(BaseRepository[InviteToken]):
    """Repository for InviteToken entities."""
    
    def __init__(self):
        super().__init__(InviteToken)
    
    def by_token(self, token: str) -> Optional[InviteToken]:
        """
        Get invite token by token string.
        
        :param token: Token string
        :return: InviteToken instance or None if not found
        """
        return db.session.query(InviteToken).filter_by(token=token).first()
    
    def by_creator(self, user_id: int) -> List[InviteToken]:
        """
        Get all invite tokens created by a user.
        
        :param user_id: User ID who created the tokens
        :return: List of invite tokens
        """
        return db.session.query(InviteToken).filter_by(created_by_user_id=user_id).order_by(
            InviteToken.created_at.desc()
        ).all()
    
    def active_tokens(self) -> List[InviteToken]:
        """
        Get all active (unused and not expired) tokens.
        
        :return: List of active invite tokens
        """
        from datetime import datetime
        return db.session.query(InviteToken).filter(
            InviteToken.is_used == False,
            InviteToken.expires_at > datetime.now()
        ).all()
