from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class EventConfig(SerializableMixin, BaseModel):
    __tablename__ = "event_config"

    id = Column(Integer, primary_key=True)
    event_type = Column(String, nullable=False)
    session_id = Column(Integer, ForeignKey("session.id"), nullable=True)  # NULL for global defaults
    enabled = Column(Boolean, nullable=False, default=True)
    frequency_minutes = Column(Integer, nullable=True)  # Optional frequency configuration

    session = relationship("RaclottoSession", lazy="selectin")






