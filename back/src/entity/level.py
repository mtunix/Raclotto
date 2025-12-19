from sqlalchemy import Column, Integer, String

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class Level(SerializableMixin, BaseModel):
    __tablename__ = "level"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    required_experience = Column(Integer, nullable=False)

