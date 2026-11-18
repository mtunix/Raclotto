from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, declared_attr


class SessionMixin(object):
    @declared_attr
    def session_id(self):
        return Column(Integer, ForeignKey('session.id'), nullable=False)

    @declared_attr
    def session(self):
        return relationship("RaclottoSession", uselist=False, lazy="selectin")


class DomainMixin(SessionMixin):
    name = Column(String)

