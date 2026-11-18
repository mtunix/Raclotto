from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from back.src.driver.database import BaseModel


class ProfilePictureHistory(BaseModel):
    __tablename__ = "profile_picture_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    profile_picture = Column(String, nullable=True)
    level_id = Column(Integer, ForeignKey("level.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    is_candidate = Column(Boolean, nullable=False, default=False)

    user = relationship("User", lazy="selectin", foreign_keys=[user_id])

    level = relationship("Level", lazy="selectin", foreign_keys=[level_id])
