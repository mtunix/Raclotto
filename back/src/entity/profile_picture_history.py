from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class ProfilePictureHistory(SerializableMixin, BaseModel):
    __tablename__ = "profile_picture_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    profile_picture = Column(String, nullable=True)
    level_id = Column(Integer, ForeignKey("level.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)

    user = relationship("User", lazy="selectin", foreign_keys=[user_id])

    level = relationship("Level", lazy="selectin", foreign_keys=[level_id])

    def as_dict(self):
        """Convert to dictionary, ensuring datetime is serializable."""
        cols = super().as_dict()
        if isinstance(self.created_at, datetime):
            cols["created_at"] = self.created_at.isoformat()
        return cols
