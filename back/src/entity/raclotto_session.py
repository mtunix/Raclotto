import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from back.src.driver.database import Base

if TYPE_CHECKING:
    from back.src.entity.event import Event
    from back.src.entity.event_config import EventConfig
    from back.src.entity.ingredient import Ingredient
    from back.src.entity.pan import Pan
    from back.src.entity.preparation_type import PreparationType
    from back.src.entity.rating import Rating
    from back.src.entity.user import User


class RaclottoSession(Base):
    """A raclette evening. Deleting one deletes everything in it; its members' accounts stay."""

    __tablename__ = "session"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(unique=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str]
    timestamp: Mapped[datetime] = mapped_column(default=datetime.now)
    active: Mapped[bool] = mapped_column(default=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"))

    pans: Mapped[list[Pan]] = relationship(back_populates="session", cascade="all")
    ingredients: Mapped[list[Ingredient]] = relationship(back_populates="session", cascade="all")
    ratings: Mapped[list[Rating]] = relationship(back_populates="session", cascade="all")
    events: Mapped[list[Event]] = relationship(back_populates="session", cascade="all")
    event_configs: Mapped[list[EventConfig]] = relationship(back_populates="session", cascade="all")
    preparation_types: Mapped[list[PreparationType]] = relationship(
        primaryjoin="RaclottoSession.id == foreign(PreparationType.session_id)", cascade="all"
    )
    members: Mapped[list[User]] = relationship(secondary="user_sessions", back_populates="sessions")
