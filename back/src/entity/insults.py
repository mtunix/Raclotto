from sqlalchemy import Column, Integer, String

from back.src.entity.base import Base, SerializableMixin


class Insult(SerializableMixin, Base):
    __tablename__ = "insult"

    id = Column(Integer, primary_key=True)
    title = Column(String)

