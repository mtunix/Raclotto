from typing import Optional

from sqlalchemy.exc import NoResultFound

from back.src.model.database import Database
from back.src.model.domain.ingredient import Ingredient
from back.src.model.domain.pan import Pan
from back.src.model.domain.raclotto_session import RaclottoSession


class StatsService:
    def __init__(self):
        self.session = Database.session()

    def all(self, session_key: Optional[str]):
        try:
            sesh = self._get_session(self.session, session_key)
        except NoResultFound:
            return []

        if sesh:
            ingredients = self.session.query(Ingredient).filter(Ingredient.session == sesh).all()
            pans = self.session.query(Pan).filter(Pan.session == sesh).all()
        else:
            ingredients = self.session.query(Ingredient).all()
            pans = self.session.query(Pan).all()

        return {
            "ingredients_most_used": [x.as_dict() for x in sorted(ingredients, key=lambda x: len(x.pans), reverse=True)],
            "ingredients_top_rated": [x.as_dict() for x in sorted(ingredients, key=lambda x: x.avg_rating(), reverse=True)],
            "pans": list(reversed([x.as_dict() for x in pans]))
        }

    def _get_session(self, session, session_key: Optional[str]) -> Optional[RaclottoSession]:
        if not session_key:
            return None

        return session.query(RaclottoSession).filter(RaclottoSession.key == session_key).one()
