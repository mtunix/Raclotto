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
    fish = Column(Boolean, nullable=False, default=False)
    histamine = Column(Boolean, nullable=False, default=True)
    fructose = Column(Boolean, nullable=False, default=True)
    lactose = Column(Boolean, nullable=False, default=True)
    gluten = Column(Boolean, nullable=False, default=True)
    color = Column(String, nullable=True, default=None)
    profile_picture = Column(String, nullable=True, default=None)
    language = Column(String, nullable=False, default='de')  # Language preference: 'en' or 'de'
    
    # Border customization
    border_style = Column(String, nullable=True, default='solid')  # CSS border style: solid, dashed, dotted, double, ridge, groove, inset, outset
    border_texture = Column(String, nullable=True, default=None)  # Texture name: cheese, bread, crispy, sauce, grilled, herbs, spices, or null
    
    # Leveling system
    experience_points = Column(Integer, nullable=False, default=0)
    level_id = Column(Integer, ForeignKey("level.id"), nullable=True)

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
    
    level = relationship(
        "Level",
        lazy="selectin"
    )

    def as_dict(self):
        """Override as_dict to exclude password for security."""
        cols = super().as_dict()
        # Remove password from serialization
        cols.pop('password', None)
        return cols
