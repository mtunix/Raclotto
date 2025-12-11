from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class UserAchievementProgress(SerializableMixin, BaseModel):
    """Tracks progress towards achievements for users."""
    __tablename__ = "user_achievement_progress"

    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True, nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievement.id"), primary_key=True, nullable=False)
    progress_value = Column(Float, nullable=False, default=0.0)  # Value between 0.0 and 1.0
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    user = relationship("User", backref="achievement_progress")
    achievement = relationship("Achievement", backref="user_progress")
