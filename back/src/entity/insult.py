from sqlalchemy import Column, Integer, String

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


class Insult(SerializableMixin, BaseModel):
    __tablename__ = "insult"

    id = Column(Integer, primary_key=True)
    title = Column(String)

