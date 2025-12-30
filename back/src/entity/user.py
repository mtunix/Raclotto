from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from back.src.driver.database import BaseModel
from back.src.entity.mixin import SerializableMixin


# Lazy import to avoid circular imports
def get_profile_picture_history():
    from back.src.entity.profile_picture_history import ProfilePictureHistory

    return ProfilePictureHistory


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
    Column(
        "achievement_id", ForeignKey("achievement.id"), primary_key=True, nullable=False
    ),
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
    language = Column(
        String, nullable=False, default="de"
    )  # Language preference: 'en' or 'de'

    # Border customization
    border_style = Column(
        String, nullable=True, default="solid"
    )  # CSS border style: solid, dashed, dotted, double, ridge, groove, inset, outset
    border_texture = Column(
        String, nullable=True, default=None
    )  # Texture name: cheese, bread, crispy, sauce, grilled, herbs, spices, or null
    glow_effect = Column(
        Boolean, nullable=True, default=False
    )  # Card glow effect (unlocked at level 7)

    # Leveling system
    experience_points = Column(Integer, nullable=False, default=0)
    level_id = Column(Integer, ForeignKey("level.id"), nullable=True)

    sessions = relationship("RaclottoSession", secondary=user_sessions, lazy="selectin")

    achievements = relationship(
        "Achievement", secondary=user_achievements, lazy="selectin"
    )

    level = relationship("Level", lazy="selectin")

    profile_picture_history = relationship(
        "ProfilePictureHistory",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="ProfilePictureHistory.user_id",
    )

    def get_profile_picture(self):
        """Get the latest profile picture URL from history, or None if no history exists."""
        if self.profile_picture_history:
            # Sort by created_at descending and get the first (most recent)
            latest = sorted(
                self.profile_picture_history, key=lambda x: x.created_at, reverse=True
            )
            return latest[0].profile_picture if latest else None
        return None

    def get_profile_picture_with_level(self):
        """Get the latest profile picture with its associated level."""
        if self.profile_picture_history:
            # Sort by created_at descending and get the first (most recent)
            latest = sorted(
                self.profile_picture_history, key=lambda x: x.created_at, reverse=True
            )
            if latest:
                return {
                    "profile_picture": latest[0].profile_picture,
                    "level_id": latest[0].level_id,
                    "level": latest[0].level.as_dict() if latest[0].level else None,
                    "created_at": latest[0].created_at.isoformat(),
                }
        return None

    def as_dict(self):
        """Override as_dict to exclude password for security and include profile_picture."""
        cols = super().as_dict()
        # Remove password from serialization
        cols.pop("password", None)
        # Include the latest profile picture from history
        cols["profile_picture"] = self.get_profile_picture()
        return cols
