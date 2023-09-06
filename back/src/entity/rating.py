from sqlalchemy import Column, Integer, String, ForeignKey

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SessionMixin, SerializableMixin


class Rating(SerializableMixin, SessionMixin, BaseModel):
    __tablename__ = "rating"

    id = Column(Integer, primary_key=True)
    rating = Column(Integer, nullable=False)
    user = Column(String, nullable=False)
    pan_id = Column(Integer, ForeignKey("pan.id"))
