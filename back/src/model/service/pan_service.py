from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session, joinedload
from wonderwords import RandomWord

from back.src.model.database import Database
from back.src.model.domain.pan import Pan, PanIngredients
from back.src.model.domain.raclotto_session import RaclottoSession
from back.src.model.service.database_service import DatabaseService
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.preparation_type_service import PreparationTypeService
from back.src.model.service.session_service import SessionService


class PanService(DatabaseService):
    def __init__(self):
        super().__init__(Pan)
        self.ingredient_service = IngredientService()
        self.session_service = SessionService()
        self.preparation_service = PreparationTypeService()

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
        r_session = self.session_service.find(pan_dict["session_id"])
        del pan_dict["session_id"]

        with self.session.begin():
            pan = Pan(session_id=r_session.id, **pan_dict)
            self.session.add(pan)

        return self.find(pan.id)

    def find(self, id):
        return self.session.query(Pan)\
            .options(joinedload(Pan.ratings), joinedload(Pan.ingredients))\
            .filter_by(id=id).one()

    def find_n_best(self, session_key=None, n=None):
        if session_key and n:
            return self.session.query(Pan).filter_by(Pan.session.key == session_key).order_by(Pan.rating).all()
        elif session_key:
            return self.session.query(Pan).filter_by(Pan.session.key == session_key).order_by(Pan.rating).all()
        elif n:
            return self.session.query(Pan).order_by(Pan.rating).all()
        else:
            return self.session.query(Pan).order_by(Pan.rating).all()

    def generate(self, gen_dict):
        for key in ["vegetarian", "vegan", "histamine", "fructose", "lactose", "gluten"]:
            gen_dict[key] = gen_dict[key] == "true"
        ingredients = self.ingredient_service.select(gen_dict)
        preparation_types = self.preparation_service.all()
        session = self.session_service.find_by_key(gen_dict["session_key"])
        r = RandomWord()

        with self.session.begin():
            pan = Pan(
                name=f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan",
                user=gen_dict["user"],
                session_id=session.id
            )
            self.session.add(pan)

        with self.session.begin():
            for i in ingredients:
                self.session.add(PanIngredients(pan_id=pan.id, ingredient_id=i.id))

        return self.find(pan.id)