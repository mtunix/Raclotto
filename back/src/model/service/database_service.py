from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from back.src.model.database import Database
from back.src.model.domain.raclotto_session import RaclottoSession


class DatabaseService:
    def __init__(self, domain_type):
        self.domain_type = domain_type

    def all(self, session_key=None):
        with Database.session() as session:
            try:
                sesh = self._get_session(session, session_key)
            except NoResultFound:
                return []

            if session_key:
                return session.query(self.domain_type).filter(self.domain_type.session == sesh).all()
            else:
                return session.query(self.domain_type).all()

    def add(self, obj_dict):
        with Database.session() as session, session.begin():
            session.add(self.domain_type(**obj_dict))

    def find(self, id):
        with Database.session() as session, session.begin():
            return session.query(self.domain_type).filter_by(id=id).one()

    def remove(self, id):
        with Database.session() as session, session.begin():
            session.delete(self.find(id))

    def _get_session(self, session, session_key):
        return session.query(RaclottoSession).filter(RaclottoSession.key == session_key).one()
