from sqlalchemy import String, Column, Integer, Boolean, Table, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from back.src.entity.mixin import SerializableMixin

from back.src.driver.database import BaseModel


user_sessions = Table(
    "user_sessions",
    BaseModel.metadata,
    Column("user_id", ForeignKey("user.id"), primary_key=True, nullable=False),
    Column("session_id", ForeignKey("session.id"), primary_key=True, nullable=False),
    Column("joined_at", DateTime, nullable=False, default=datetime.now),
)

user_achievements = Table(
    "user_achievements",
    BaseModel.metadata,
    Column("user_id", ForeignKey("user.id"), primary_key=True, nullable=False),
    Column("achievement_id", ForeignKey("achievement.id"), primary_key=True, nullable=False),
)

user_event_dismissals = Table(
    "user_event_dismissals",
    BaseModel.metadata,
    Column("user_id", ForeignKey("user.id"), primary_key=True, nullable=False),
    Column("event_id", ForeignKey("event.id"), primary_key=True, nullable=False),
)


class User(SerializableMixin, BaseModel):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=True, unique=True)
    password = Column(String, nullable=False)

    # Refers to what a user wants to eat
    # Having a flag set false means that the user does not want to eat this
    meat = Column(Boolean, nullable=False, default=False)
    vegetarian = Column(Boolean, nullable=False, default=True)
    vegan = Column(Boolean, nullable=False, default=True)
    histamine = Column(Boolean, nullable=False, default=True)
    fructose = Column(Boolean, nullable=False, default=True)
    lactose = Column(Boolean, nullable=False, default=True)
    gluten = Column(Boolean, nullable=False, default=True)
    color = Column(String, nullable=True, default=None)

    sessions = relationship(
        "RaclottoSession",
        secondary=user_sessions,
        lazy="selectin"
    )

    achievements = relationship(
        "Achievement",
        secondary=user_achievements,
        lazy="selectin"
    )

    def as_dict(self):
        """Override as_dict to exclude password for security."""
        cols = super().as_dict()
        # Remove password from serialization
        cols.pop('password', None)
        return cols
