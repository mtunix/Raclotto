from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from back.src.model.database import Database
from back.src.model.domain.raclotto_session import RaclottoSession
from back.src.model.service.database_service import DatabaseService


class SessionService(DatabaseService):
    def __init__(self):
        super().__init__(RaclottoSession)

    def find(self, key):
        with Session(Database.engine()) as session, session.begin():
            try:
                return session.query(self.domain_type).filter_by(key=key).one()
            except NoResultFound:
                self.add({"key": key})
                return session.query(self.domain_type).filter_by(key=key).one()

