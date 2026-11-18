from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base
from back.src.entity.mixin import SessionMixin


class Rating(SessionMixin, Base):
    __tablename__ = "rating"

    id: Mapped[int] = mapped_column(primary_key=True)
    # SQLite keeps half stars as they are sent, so the Integer column holds floats.
    rating: Mapped[float] = mapped_column(Integer)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    pan_id: Mapped[int] = mapped_column(ForeignKey("pan.id"))
