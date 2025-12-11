import secrets
from datetime import datetime, timedelta

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class InviteToken(SerializableMixin, BaseModel):
    __tablename__ = "invite_token"

    id = Column(Integer, primary_key=True)
    token = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, nullable=False, default=False)
    used_at = Column(DateTime, nullable=True)

    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def create_expiration_date(days: int = 7) -> datetime:
        """Create an expiration date N days from now."""
        return datetime.now() + timedelta(days=days)

    def is_valid(self) -> bool:
        """Check if the token is valid (not used and not expired)."""
        if self.is_used:
            return False
        if datetime.now() > self.expires_at:
            return False
        return True

    def mark_as_used(self):
        """Mark the token as used."""
        self.is_used = True
        self.used_at = datetime.now()
