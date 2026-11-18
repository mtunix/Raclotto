from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base


class Insult(Base):
    __tablename__ = "insult"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str | None]
