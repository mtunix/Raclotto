from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from back.src.driver.database import Base

if TYPE_CHECKING:
    from back.src.entity.level import Level
    from back.src.entity.user import User


class ProfilePictureHistory(Base):
    __tablename__ = "profile_picture_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    profile_picture: Mapped[str | None]
    level_id: Mapped[int | None] = mapped_column(ForeignKey("level.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    is_candidate: Mapped[bool] = mapped_column(default=False)

    user: Mapped["User"] = relationship("User", lazy="selectin", foreign_keys=[user_id])

    level: Mapped["Level | None"] = relationship("Level", lazy="selectin", foreign_keys=[level_id])
