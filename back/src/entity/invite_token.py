import secrets
from datetime import datetime, timedelta

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base


class InviteToken(Base):
    __tablename__ = "invite_token"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(unique=True, index=True)
    email: Mapped[str]
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    expires_at: Mapped[datetime]
    is_used: Mapped[bool] = mapped_column(default=False)
    used_at: Mapped[datetime | None]

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
        return datetime.now() <= self.expires_at

    def mark_as_used(self) -> None:
        """Mark the token as used."""
        self.is_used = True
        self.used_at = datetime.now()
