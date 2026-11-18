from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base


class PreparationType(Base):
    __tablename__ = "preparation_type"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    session_id: Mapped[int | None]  # null means it's a default/system-wide type
