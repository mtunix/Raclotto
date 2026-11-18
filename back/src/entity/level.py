from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base


class Level(Base):
    __tablename__ = "level"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    label_en: Mapped[str]
    label_de: Mapped[str]
    required_experience: Mapped[int]
