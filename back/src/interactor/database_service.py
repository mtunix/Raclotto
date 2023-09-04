from sqlalchemy.exc import NoResultFound

from back.src.driver.database import db
from back.src.entity.raclotto_session import RaclottoSession


class DatabaseService:
    def __init__(self, domain_type):
        self.domain_type = domain_type

    def all(self, session_key=None):
        if session_key:
            try:
                sesh = self._get_session(db.session, session_key)
            except NoResultFound:
                return []

            return db.session.query(self.domain_type).filter(self.domain_type.session == sesh).all()
        else:
            return db.session.query(self.domain_type).all()

    def add(self, obj_dict):
        with db.session.begin():
            obj = self.domain_type(**obj_dict)
            db.session.add(obj)
            return obj

    def find(self, id):
        return db.session.query(self.domain_type).filter_by(id=id).one()

    def delete(self, parsed):
        with db.session.begin():
            item = self.find(parsed["id"])
            if item.session.key == parsed["session_key"]:
                db.session.delete(item)

        return self.find(item.id)

    def _get_session(self, session, session_key):
        return session.query(RaclottoSession).filter(RaclottoSession.key == session_key).one()
