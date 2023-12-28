from sqlalchemy import select, func
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload

from back.src.model.database import Database
from back.src.model.domain.ingredient import Ingredient
from back.src.model.domain.pan import PanIngredients, Pan
from back.src.model.domain.raclotto_session import RaclottoSession


class StatsService:
    def __init__(self):
        self.session = Database.session()

    def all(self, session_key):
        try:
            sesh = self._get_session(self.session, session_key)
        except NoResultFound:
            return []

        ingredients = self.session.query(Ingredient).all()

        return {
            "ingredients_most_used": [x.as_dict() for x in sorted(ingredients, key=lambda x: len(x.pans), reverse=True)],
            "ingredients_top_rated": [x.as_dict() for x in sorted(ingredients, key=lambda x: x.avg_rating(), reverse=True)],
            "pans": [x.as_dict() for x in self.session.query(Pan).filter(Pan.session == sesh).all()],
        }

    def _get_session(self, session, session_key):
        return session.query(RaclottoSession).filter(RaclottoSession.key == session_key).one()
