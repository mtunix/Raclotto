from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session, joinedload
from wonderwords import RandomWord

from back.src.model.database import Database
from back.src.model.domain.pan import Pan
from back.src.model.domain.raclotto_session import RaclottoSession
from back.src.model.service.database_service import DatabaseService
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.session_service import SessionService


class PanService(DatabaseService):
    def __init__(self):
        super().__init__(Pan)
        self.ingredient_service = IngredientService()
        self.session_service = SessionService()

    def all(self, session_key=None):
        try:
            sesh = self._get_session(self.session, session_key)
        except NoResultFound:
            return []

        if session_key:
            return self.session.query(Pan)\
                .filter(Pan.session == sesh)\
                .all()
        else:
            return self.session.query(self.domain_type) \
                .all()

    def add(self, pan_dict):
        ingredients = []
        for i in pan_dict["ingredients"]:
            ingredients.append(self.ingredient_service.find(i))
        pan_dict["ingredients"] = ingredients
        r_session = self.session_service.find(pan_dict["session_key"])
        del pan_dict["session_key"]

        with self.session.begin():
            pan = Pan(session_id=r_session.id, **pan_dict)
            self.session.add(pan)

        return self.find(pan.id)

    def find(self, id):
        return self.session.query(self.domain_type)\
            .options(joinedload(Pan.ratings), joinedload(Pan.ingredients))\
            .filter_by(id=id).one()

    def generate(self, gen_dict):
        ingredients = self.ingredient_service.select(gen_dict)
        r = RandomWord()
        return Pan(
            name=f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan",
            ingredients=ingredients,
            user=gen_dict["user"]
        )