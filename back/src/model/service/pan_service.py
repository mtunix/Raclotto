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
        with Session(Database.engine()) as session:
            try:
                sesh = self._get_session(session, session_key)
            except NoResultFound:
                return []

            if session_key:
                return session.query(Pan)\
                    .options(joinedload(Pan.ratings), joinedload(Pan.ingredients))\
                    .filter(Pan.session == sesh)\
                    .all()
            else:
                return session.query(self.domain_type) \
                    .options(joinedload(Pan.ratings), joinedload(Pan.ingredients))\
                    .all()

    def add(self, pan_dict):
        ingredients = []
        for i in pan_dict["ingredients"]:
            ingredients.append(self.ingredient_service.find(i))
        pan_dict["ingredients"] = ingredients
        r_session = self.session_service.find(pan_dict["session_key"])
        del pan_dict["session_key"]

        with Session(Database.engine()) as session, session.begin():
            session.add(Pan(**pan_dict, session=r_session))

    def generate(self, gen_dict):
        ingredients = self.ingredient_service.select(gen_dict)
        r = RandomWord()
        return Pan(
            name=f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan",
            ingredients=ingredients,
            user=gen_dict["user"]
        )