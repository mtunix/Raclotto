from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from back.src.driver.database import Base

if TYPE_CHECKING:
    from back.src.entity.raclotto_session import RaclottoSession
    from back.src.entity.user import User


class Event(Base):
    __tablename__ = "event"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("session.id"))
    event_type: Mapped[str]
    message: Mapped[str]
    data: Mapped[dict[str, Any] | None] = mapped_column(JSON)  # Additional event data (pan IDs, user names, etc.)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    session: Mapped[RaclottoSession] = relationship("RaclottoSession", back_populates="events", lazy="selectin")
    # Only so that deleting an event deletes its dismissals.
    dismissed_by: Mapped[list[User]] = relationship(secondary="user_event_dismissals")
