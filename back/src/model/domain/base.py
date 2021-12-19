from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, declared_attr

Base = declarative_base()


class SessionMixin(object):
    @declared_attr
    def session_id(self):
        return Column(Integer, ForeignKey('session.id'), nullable=False)

    @declared_attr
    def session(self):
        return relationship("RaclottoSession", uselist=False, lazy="selectin")


class SerializableMixin(object):
    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class DomainMixin(SerializableMixin, SessionMixin):
    name = Column(String)

