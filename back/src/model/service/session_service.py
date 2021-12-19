from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from back.src.model.database import Database
from back.src.model.domain.raclotto_session import RaclottoSession
from back.src.model.service.database_service import DatabaseService


class SessionService(DatabaseService):
    def __init__(self):
        super().__init__(RaclottoSession)
        self.session = Database.session()

    def find(self, key):
        try:
            return self.session.query(self.domain_type).filter_by(key=key).one()
        except NoResultFound:
            self.add({"key": key})
            return self.session.query(self.domain_type).filter_by(key=key).one()

