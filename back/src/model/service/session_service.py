import hashlib
from datetime import datetime

from sqlalchemy.exc import NoResultFound

from back.src.model.database import Database
from back.src.model.domain.raclotto_session import RaclottoSession
from back.src.model.service.database_service import DatabaseService


class SessionService(DatabaseService):
    def __init__(self):
        super().__init__(RaclottoSession)
        self.session = Database.session()

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
        return self.session.query(RaclottoSession).filter_by(key=key).one()

    def validate(self, key):
        return self.session.query(RaclottoSession).filter_by(key=key).first() is not None



