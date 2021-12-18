from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from back.src.model.domain.base import Base, SerializableMixin, SessionMixin


class Rating(SessionMixin, Base):
    __tablename__ = "rating"

    id = Column(Integer, primary_key=True)
    rating = Column(Integer, nullable=False)
    user = Column(String, nullable=False)
