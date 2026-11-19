from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, ForeignKey, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from back.src.driver.database import Base

if TYPE_CHECKING:
    from back.src.entity.achievement import Achievement
    from back.src.entity.level import Level
    from back.src.entity.profile_picture_history import ProfilePictureHistory
    from back.src.entity.raclotto_session import RaclottoSession


user_sessions = Table(
    "user_sessions",
    Base.metadata,
    Column("user_id", ForeignKey("user.id"), primary_key=True, nullable=False),
    Column("session_id", ForeignKey("session.id"), primary_key=True, nullable=False),
    Column("joined_at", DateTime, nullable=False, default=datetime.now),
)

user_achievements = Table(
    "user_achievements",
    Base.metadata,
    Column("user_id", ForeignKey("user.id"), primary_key=True, nullable=False),
    Column("achievement_id", ForeignKey("achievement.id"), primary_key=True, nullable=False),
)

user_event_dismissals = Table(
    "user_event_dismissals",
    Base.metadata,
    Column("user_id", ForeignKey("user.id"), primary_key=True, nullable=False),
    Column("event_id", ForeignKey("event.id"), primary_key=True, nullable=False),
)


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    email: Mapped[str | None] = mapped_column(unique=True)
    password: Mapped[str]

    # Refers to what a user wants to eat
    # Having a flag set false means that the user does not want to eat this
    meat: Mapped[bool] = mapped_column(default=False)
    vegetarian: Mapped[bool] = mapped_column(default=True)
    vegan: Mapped[bool] = mapped_column(default=True)
    fish: Mapped[bool] = mapped_column(default=False)
    histamine: Mapped[bool] = mapped_column(default=True)
    fructose: Mapped[bool] = mapped_column(default=True)
    lactose: Mapped[bool] = mapped_column(default=True)
    gluten: Mapped[bool] = mapped_column(default=True)
    color: Mapped[str | None] = mapped_column(default=None)
    language: Mapped[str] = mapped_column(default="de")  # Language preference: 'en' or 'de'

    # Border customization
    border_style: Mapped[str | None] = mapped_column(
        default="solid"
    )  # CSS border style: solid, dashed, dotted, double, ridge, groove, inset, outset
    border_texture: Mapped[str | None] = mapped_column(
        default=None
    )  # Texture name: cheese, bread, crispy, sauce, grilled, herbs, spices, or null
    glow_effect: Mapped[bool | None] = mapped_column(default=False)  # Card glow effect (unlocked at level 7)

    # Leveling system
    experience_points: Mapped[int] = mapped_column(default=0)
    level_id: Mapped[int | None] = mapped_column(ForeignKey("level.id"))

    sessions: Mapped[list[RaclottoSession]] = relationship("RaclottoSession", secondary=user_sessions, lazy="selectin")

    achievements: Mapped[list[Achievement]] = relationship("Achievement", secondary=user_achievements, lazy="selectin")

    level: Mapped[Level | None] = relationship("Level", lazy="selectin")

    profile_picture_history: Mapped[list[ProfilePictureHistory]] = relationship(
        "ProfilePictureHistory",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="ProfilePictureHistory.user_id",
    )

    def get_profile_picture(self) -> str | None:
        """Get the latest profile picture URL from history, or None if no history exists."""
        if self.profile_picture_history:
            # Sort by created_at descending and get the first (most recent)
            latest = sorted(self.profile_picture_history, key=lambda x: x.created_at, reverse=True)
            return latest[0].profile_picture if latest else None
        return None
