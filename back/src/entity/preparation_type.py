from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from back.src.driver.database import Base

if TYPE_CHECKING:
    from back.src.entity.pan import Pan


class PreparationType(Base):
    __tablename__ = "preparation_type"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    # Null for a default type, which every session offers.
    session_id: Mapped[int | None] = mapped_column(ForeignKey("session.id"))

    # Deleting a type leaves the pans made with it without one.
    pans: Mapped[list[Pan]] = relationship(back_populates="preparation_type")
