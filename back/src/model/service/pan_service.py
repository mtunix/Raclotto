from sqlalchemy.orm import Session, joinedload
from wonderwords import RandomWord

from back.src.model.database import Database
from back.src.model.domain.pan import Pan
from back.src.model.service.database_service import DatabaseService
from back.src.model.service.ingredient_service import IngredientService


class PanService(DatabaseService):
    def __init__(self):
        super().__init__(Pan)
        self.ingredient_service = IngredientService()

    def all(self, session_id=None):
        with Session(Database.engine()) as session:
            if session_id:
                return session.query(Pan)\
                    .options(joinedload(Pan.ratings), joinedload(Pan.ingredients))\
                    .filter(Pan.session_id == session_id)\
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

        with Session(Database.engine()) as session, session.begin():
            session.add(Pan(**pan_dict))

    def generate(self, gen_dict):
        ingredients = self.ingredient_service.select(gen_dict)
        r = RandomWord()
        return Pan(
            name=f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan",
            ingredients=ingredients,
            user=gen_dict["user"]
        )