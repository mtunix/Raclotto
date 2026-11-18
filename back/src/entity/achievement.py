from sqlalchemy.orm import Mapped, mapped_column

from back.src.driver.database import Base


class Achievement(Base):
    __tablename__ = "achievement"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str | None]
    description: Mapped[str | None]
    value: Mapped[int | None]
    hidden: Mapped[bool | None]
    is_global: Mapped[bool] = mapped_column(default=True)
    """
    Flag to indicate if achievement is global or session-specific.
    - True: Achievement is global (evaluated across all sessions)
    - False: Achievement is session-specific (evaluated within a single session)
    """
