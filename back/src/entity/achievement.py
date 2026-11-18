from sqlalchemy import Column, Integer, String, Boolean

from back.src.driver.database import BaseModel


class Achievement(BaseModel):
    __tablename__ = "achievement"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String)
    value = Column(Integer)
    hidden = Column(Boolean)
    is_global = Column(Boolean, nullable=False, default=True)
    """
    Flag to indicate if achievement is global or session-specific.
    - True: Achievement is global (evaluated across all sessions)
    - False: Achievement is session-specific (evaluated within a single session)
    """

