from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Boolean

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class RaclottoSession(SerializableMixin, BaseModel):
    __tablename__ = "session"

    id = Column(Integer, primary_key=True)
    key = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.now())
    active = Column(Boolean, nullable=False, default=True)
