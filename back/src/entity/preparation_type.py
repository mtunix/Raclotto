from sqlalchemy import Column, Integer, String
from back.src.entity.mixin import SerializableMixin
from back.src.driver.database import BaseModel


class PreparationType(SerializableMixin, BaseModel):
    __tablename__ = "preparation_type"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    session_id = Column(Integer, nullable=True)  # null means it's a default/system-wide type

