from typing import NamedTuple

from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload
from wonderwords import RandomWord

from back.src.driver.database import db
from back.src.entity.ingredient import GenerationParameters
from back.src.entity.pan import Pan
from back.src.interactor.database_service import DatabaseInteractor
from back.src.interactor.ingredient_interactor import IngredientInteractor
from back.src.interactor.session_service import SessionService


class PanInteractor(DatabaseInteractor):
    def __init__(self):
        super().__init__(Pan)
        self.ingredient_interactor = IngredientInteractor()
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
            ingredients.append(self.ingredient_interactor.find(i))
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

    def generate(self, params: GenerationParameters):
        ingredients = self.ingredient_interactor.select(params)
        session = self.session_service.find_by_key(params.session_key)
        r = RandomWord()

        pan = Pan(
            name=f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan",
            ingredients=ingredients,
            user=params.user,
            session_id=session.id
        )
        db.session.add(pan)
        db.session.commit()

        return pan
