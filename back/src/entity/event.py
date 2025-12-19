from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class Event(SerializableMixin, BaseModel):
    __tablename__ = "event"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("session.id"), nullable=False)
    event_type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    data = Column(JSON, nullable=True)  # Additional event data (pan IDs, user names, etc.)
    created_at = Column(DateTime, nullable=False, default=datetime.now)

    session = relationship("RaclottoSession", lazy="selectin")






