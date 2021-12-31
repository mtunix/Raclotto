from sqlalchemy import Column, Integer, String

from back.src.model.domain.base import Base, SerializableMixin


class Achievement(SerializableMixin, Base):
    __tablename__ = "achievement"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String)
    value = Column(Integer)
    hidden = Column(Boolean)

