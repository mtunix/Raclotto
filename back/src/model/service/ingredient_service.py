from sqlalchemy.orm import Session

from back.src.model.database import Database
from back.src.model.domain.ingredient import IngredientType, Ingredient
from back.src.model.service.database_service import DatabaseService


class IngredientService(DatabaseService):
    def __init__(self):
        super().__init__(Ingredient)

    def all(self, session_id):
        with Session(Database.engine()) as session:
            return session.query(Ingredient).filter(Ingredient.session_id == session_id).all()

    def add(self, obj_dict):
        obj_dict["type"] = IngredientType(obj_dict["type"])

        with Session(Database.engine()) as session, session.begin():
            session.add(Ingredient(**obj_dict))
