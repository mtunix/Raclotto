from random import sample

from sqlalchemy.exc import NoResultFound, IntegrityError
from sqlalchemy.orm import Session, joinedload

from back.src.model.database import Database
from back.src.model.domain.ingredient import IngredientType, Ingredient
from back.src.model.domain.raclotto_session import RaclottoSession
from back.src.model.service.database_service import DatabaseService
from back.src.model.service.session_service import SessionService


class IngredientService(DatabaseService):
    def __init__(self):
        super().__init__(Ingredient)
        self.session_service = SessionService()

    def all(self, session_key=None, of_type=None):
        try:
            sesh = self._get_session(self.session, session_key)
        except NoResultFound:
            return []

        if session_key and of_type:
            return self.session.query(Ingredient)\
                .options(joinedload(Ingredient.session))\
                .filter(Ingredient.session_id == sesh.id,
                        Ingredient.type == IngredientType(int(of_type)))\
                .all()
        elif session_key:
            return self.session.query(Ingredient)\
                .options(joinedload(Ingredient.session))\
                .filter(Ingredient.session_id == sesh.id).all()
        else:
            return self.session.query(Ingredient)\
                .options(joinedload(Ingredient.session))\
                .all()

    def all_filtered(self, gen_dict, of_type):
        try:
            sesh = self._get_session(self.session, gen_dict["session_key"])
        except NoResultFound:
            return []

        return self.session.query(Ingredient).filter(
            Ingredient.session_id == sesh.id,
            Ingredient.vegan == gen_dict["vegan"],
            Ingredient.vegetarian == gen_dict["vegetarian"],
            Ingredient.fructose == gen_dict["fructose"],
            Ingredient.histamine == gen_dict["histamine"],
            Ingredient.gluten == gen_dict["gluten"],
            Ingredient.lactose == gen_dict["lactose"],
            Ingredient.type == IngredientType(int(of_type))
        ).all()

    def add(self, obj_dict):
        obj_dict["type"] = IngredientType(obj_dict["type"])
        # r_session = self.session_service.find(obj_dict["session_key"])
        # del obj_dict["session_key"]

        with self.session.begin():
            # ingredient = Ingredient(**obj_dict, session=r_session)
            ingredient = Ingredient(**obj_dict)
            self.session.add(ingredient)

        return ingredient

    def delete(self, session_key, id):
        ingredient = self.find(id)
        if ingredient.session.key == session_key:
            try:
                with self.session.begin():
                    self.session.delete(ingredient)
            except IntegrityError:
                with self.session.begin():
                    ingredient.available = False

    def select(self, gen_dict):
        fills = self.all_filtered(gen_dict, 1)
        sauces = self.all_filtered(gen_dict, 2)
        num_fill = gen_dict["num_fill"] if len(fills) >= gen_dict["num_fill"] else len(fills)
        num_sauce = gen_dict["num_sauce"] if len(sauces) >= gen_dict["num_sauce"] else len(sauces)
        return sample(fills, num_fill) + sample(sauces, num_sauce)
