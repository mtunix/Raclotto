from sqlalchemy import Column, Integer, String

from back.src.model.domain.base import Base, SerializableMixin


class Insult(SerializableMixin, Base):
    __tablename__ = "insult"

    id = Column(Integer, primary_key=True)
    title = Column(String)

