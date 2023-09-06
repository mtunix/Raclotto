from sqlalchemy import Column, Integer, String, Boolean

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class Achievement(SerializableMixin, BaseModel):
    __tablename__ = "achievement"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String)
    value = Column(Integer)
    hidden = Column(Boolean)

