from random import sample

from sqlalchemy.orm import Session

from back.src.model.database import Database
from back.src.model.domain.ingredient import IngredientType, Ingredient
from back.src.model.service.database_service import DatabaseService


class IngredientService(DatabaseService):
    def __init__(self):
        super().__init__(Ingredient)

    def all(self, session_id=None, of_type=None):
        with Session(Database.engine()) as session:
            if session_id and of_type:
                return session.query(Ingredient)\
                    .filter(Ingredient.session_id == session_id,
                            Ingredient.type == IngredientType(int(of_type)))\
                    .all()
            elif session_id:
                return session.query(Ingredient).filter(Ingredient.session_id == session_id).all()
            else:
                return session.query(Ingredient).all()

    def all_filtered(self, gen_dict, of_type):
        with Session(Database.engine()) as session:
            return session.query(Ingredient).filter(
                Ingredient.vegan == gen_dict["vegan"],
                Ingredient.vegetarian == gen_dict["vegetarian"],
                Ingredient.fructose == gen_dict["fructose"],
                Ingredient.histamine == gen_dict["histamine"],
                Ingredient.gluten == gen_dict["gluten"],
                Ingredient.lactose == gen_dict["lactose"],
                Ingredient.type == of_type
            ).all()

    def add(self, obj_dict):
        obj_dict["type"] = IngredientType(obj_dict["type"])

        with Session(Database.engine()) as session, session.begin():
            session.add(Ingredient(**obj_dict))

    def select(self, gen_dict):
        fills = self.all_filtered(gen_dict, 1)
        sauces = self.all_filtered(gen_dict, 2)
        num_fill = gen_dict["num_fill"] if len(fills) >= gen_dict["num_fill"] else len(fills)
        num_sauce = gen_dict["num_sauce"] if len(sauces) >= gen_dict["num_sauce"] else len(sauces)
        return sample(fills, num_fill) + sample(sauces, num_sauce)
