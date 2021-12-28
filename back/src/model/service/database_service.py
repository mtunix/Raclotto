from sqlalchemy.exc import NoResultFound

from back.src.model.database import Database
from back.src.model.domain.raclotto_session import RaclottoSession


class DatabaseService:
    def __init__(self, domain_type):
        self.domain_type = domain_type
        self.session = Database.session()

    def all(self, session_key=None):
        if session_key:
            try:
                sesh = self._get_session(self.session, session_key)
            except NoResultFound:
                return []

            return self.session.query(self.domain_type).filter(self.domain_type.session == sesh).all()
        else:
            return self.session.query(self.domain_type).all()

    def add(self, obj_dict):
        with self.session.begin():
            obj = self.domain_type(**obj_dict)
            self.session.add(obj)
            return obj

    def find(self, id):
        return self.session.query(self.domain_type).filter_by(id=id).one()

    def delete(self, session_key, id):
        with self.session.begin():
            item = self.find(id)
            if item.session.key == session_key:
                self.session.delete(item)

    def _get_session(self, session, session_key):
        return session.query(RaclottoSession).filter(RaclottoSession.key == session_key).one()
