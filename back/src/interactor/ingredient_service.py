import random
from random import sample

from sqlalchemy import or_
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload

from back.src.entity import IngredientType, Ingredient
from back.src.interactor.database_service import DatabaseService
from back.src.interactor.session_service import SessionService


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

        query = self.session.query(Ingredient).filter(
            Ingredient.session_id == sesh.id,
            Ingredient.type == IngredientType(int(of_type))
        )

        if gen_dict["meat"]:
            query = query.filter(or_(Ingredient.meat == gen_dict["meat"], Ingredient.vegetarian, Ingredient.vegan))
        else:
            if gen_dict["vegetarian"]:
                query = query.filter(or_(Ingredient.vegetarian == gen_dict["vegetarian"], Ingredient.vegan))
            else:
                if gen_dict["vegan"]:
                    query = query.filter(Ingredient.vegan == gen_dict["vegan"])

        if not gen_dict["fructose"]:
            query = query.filter(Ingredient.fructose == gen_dict["fructose"])

        if not gen_dict["histamine"]:
            query = query.filter(Ingredient.histamine == gen_dict["histamine"])

        if not gen_dict["gluten"]:
            query = query.filter(Ingredient.histamine == gen_dict["histamine"])

        if not gen_dict["lactose"]:
            query = query.filter(Ingredient.lactose == gen_dict["lactose"])

        return query.all()

    def add(self, obj_dict):
        obj_dict["type"] = IngredientType(obj_dict["type"])
        r_session = self.session_service.find_by_key(obj_dict["session_key"])
        del obj_dict["session_key"]

        with self.session.begin():
            ingredient = Ingredient(**obj_dict, session=r_session)
            # ingredient = Ingredient(**obj_dict)
            self.session.add(ingredient)

        return self.find(ingredient.id)

    def delete(self, parsed):
        ingredient = self.find(parsed["id"])
        if ingredient.session.key == parsed["session_key"]:
            with self.session.begin():
                ingredient.available = False

        return self.find(ingredient.id)

    def select(self, gen_dict):
        random.seed()
        fills = self.all_filtered(gen_dict, 1)
        sauces = self.all_filtered(gen_dict, 2)
        num_fill = gen_dict["num_fill"] if len(fills) >= gen_dict["num_fill"] else len(fills)
        num_sauce = gen_dict["num_sauce"] if len(sauces) >= gen_dict["num_sauce"] else len(sauces)
        return sample(fills, num_fill) + sample(sauces, num_sauce)

    def refill(self, parsed):
        try:
            ingredient = self.find(parsed["id"])
            with self.session.begin():
                ingredient.available = True
        except NoResultFound:
            return None

        return self.find(ingredient.id)
