from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

if TYPE_CHECKING:
    from back.src.entity.raclotto_session import RaclottoSession


class SessionMixin:
    @declared_attr
    def session_id(cls) -> Mapped[int]:
        return mapped_column(ForeignKey("session.id"))

    @declared_attr
    def session(cls) -> Mapped[RaclottoSession]:
        return relationship("RaclottoSession", uselist=False, lazy="selectin")


class DomainMixin(SessionMixin):
    name: Mapped[str | None] = mapped_column()
