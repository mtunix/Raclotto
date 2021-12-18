from sqlalchemy import Column, Integer, String

from back.src.model.domain.base import Base, SerializableMixin


class RaclottoSession(Base):
    __tablename__ = "session"

    id = Column(Integer, primary_key=True)
    key = Column(String, nullable=False, unique=True)
