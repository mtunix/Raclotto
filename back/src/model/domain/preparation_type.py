from sqlalchemy import Column, Integer, String

from back.src.model.domain.base import DomainMixin, Base


class PreparationType(DomainMixin, Base):
    __tablename__ = "preparation_type"

    id = Column(Integer, primary_key=True)
