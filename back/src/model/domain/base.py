from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import declarative_base


Base = declarative_base()


class DomainMixin(object):
    name = Column(String)
    session_id = Column(String)
