from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import declarative_base


Base = declarative_base()


class DomainMixin(object):
    name = Column(String)
    session_id = Column(String)


class SerializableMixin(object):
    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
