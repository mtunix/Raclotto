from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from back.src.driver.database import Base

if TYPE_CHECKING:
    from back.src.entity.achievement import Achievement
    from back.src.entity.user import User


class UserAchievementProgress(Base):
    """Tracks progress towards achievements for users."""
    __tablename__ = "user_achievement_progress"

    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), primary_key=True)
    achievement_id: Mapped[int] = mapped_column(ForeignKey("achievement.id"), primary_key=True)
    progress_value: Mapped[float] = mapped_column(Float, default=0.0)  # Value between 0.0 and 1.0
    updated_at: Mapped[datetime] = mapped_column(default=datetime.now, onupdate=datetime.now)

    user: Mapped["User"] = relationship("User", backref="achievement_progress")
    achievement: Mapped["Achievement"] = relationship("Achievement", backref="user_progress")
