from sqlalchemy import String, Column, Integer, Boolean, Table, ForeignKey
from sqlalchemy.orm import relationship

from back.src.entity.mixin import SerializableMixin

from back.src.driver.database import BaseModel


user_sessions = Table(
    "user_sessions",
    BaseModel.metadata,
    Column("user_id", ForeignKey("user.id"), primary_key=True, nullable=False),
    Column("session_id", ForeignKey("session.id"), primary_key=True, nullable=False),
)


class User(SerializableMixin, BaseModel):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)

    # Refers to what a user wants to eat
    # Having a flag set false means that the user does not want to eat this
    meat = Column(Boolean, nullable=False, default=False)
    vegetarian = Column(Boolean, nullable=False, default=True)
    vegan = Column(Boolean, nullable=False, default=True)
    histamine = Column(Boolean, nullable=False, default=True)
    fructose = Column(Boolean, nullable=False, default=True)
    lactose = Column(Boolean, nullable=False, default=True)
    gluten = Column(Boolean, nullable=False, default=True)

    sessions = relationship(
        "RaclottoSession",
        secondary=user_sessions,
        lazy="selectin"
    )
