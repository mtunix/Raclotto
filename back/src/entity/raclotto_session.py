import uuid
from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base


class RaclottoSession(Base):
    __tablename__ = "session"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(unique=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str]
    timestamp: Mapped[datetime] = mapped_column(default=datetime.now)
    active: Mapped[bool] = mapped_column(default=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"))
