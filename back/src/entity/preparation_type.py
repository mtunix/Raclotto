from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base


class PreparationType(Base):
    __tablename__ = "preparation_type"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    # Null for a default type, which every session offers.
    session_id: Mapped[int | None] = mapped_column(ForeignKey("session.id"))
