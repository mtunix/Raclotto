from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from back.src.driver.database import Base

if TYPE_CHECKING:
    from back.src.entity.raclotto_session import RaclottoSession


class EventConfig(Base):
    __tablename__ = "event_config"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type: Mapped[str]
    session_id: Mapped[int | None] = mapped_column(ForeignKey("session.id"))  # NULL for global defaults
    enabled: Mapped[bool] = mapped_column(default=True)
    frequency_minutes: Mapped[int | None]  # Optional frequency configuration

    session: Mapped[RaclottoSession | None] = relationship("RaclottoSession", lazy="selectin")
