from sqlalchemy import Column, Integer, String

from back.src.model.domain.base import Base


class Rating(Base):
    __tablename__ = "rating"

    id = Column(Integer, primary_key=True)
    rating = Column(Integer)
    user = Column(String)
