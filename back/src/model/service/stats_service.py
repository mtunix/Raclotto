from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload

from back.src.model.database import Database
from back.src.model.domain.ingredient import Ingredient
from back.src.model.domain.raclotto_session import RaclottoSession


class StatsService:
    def __init__(self):
        self.session = Database.session()

    def all(self, session_key):
        try:
            sesh = self._get_session(self.session, session_key)
        except NoResultFound:
            return []

        return []

    def _get_session(self, session, session_key):
        return session.query(RaclottoSession).filter(RaclottoSession.key == session_key).one()
