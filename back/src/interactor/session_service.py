import hashlib
from datetime import datetime

from sqlalchemy.exc import NoResultFound

from back.src.driver.database import db
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.database_service import DatabaseInteractor


class SessionService(DatabaseInteractor):
    def __init__(self):
        super().__init__(RaclottoSession)

    def all(self, session_key=None):
        if session_key:
            try:
                sesh = self._get_session(self.session, session_key)
            except NoResultFound:
                return []

            return self.session.query(RaclottoSession) \
                .filter(RaclottoSession.session == sesh, RaclottoSession.active).all()
        else:
            return self.session.query(RaclottoSession).filter(RaclottoSession.active).all()

    def add(self, obj_dict):
        sesh = RaclottoSession(
            key=hashlib.sha256(str(datetime.now()).encode("ASCII")).hexdigest(),
            name=obj_dict["name"],
            timestamp=datetime.now()
        )

        with self.session.begin():
            self.session.add(sesh)

        return sesh

    def find_by_key(self, key):
        return db.session.query(RaclottoSession).filter_by(key=key).one()

    def validate(self, key):
        return self.session.query(RaclottoSession).filter_by(key=key).first() is not None

    def close(self, parsed):
        r_session = self.find_by_key(parsed["session_key"])
        with self.session.begin():
            r_session.active = False
            self.session.add(r_session)

        return self.find(r_session.id)
