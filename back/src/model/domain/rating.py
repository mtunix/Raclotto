from sqlalchemy import Column, Integer, String

from back.src.model.domain.base import Base, SessionMixin


class Rating(SessionMixin, Base):
    __tablename__ = "rating"

    id = Column(Integer, primary_key=True)
    rating = Column(Integer, nullable=False)
    user = Column(String, nullable=False)
