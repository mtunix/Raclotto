from sqlalchemy.orm import Session

from back.src.model.database import Database
from back.src.model.domain.pan import Pan
from back.src.model.domain.rating import Rating
from back.src.model.service.database_service import DatabaseService


class RatingService(DatabaseService):
    def __init__(self):
        super().__init__(Rating)

    def add(self, obj_dict):
        ingredients = []
        with Session(Database.engine()) as session, session.begin():
            pan = session.query(Pan).filter_by(id=obj_dict["pan"]).one()
            del obj_dict["pan"]
            # session.add(Rating(**obj_dict))
            pan.ratings.append(Rating(**obj_dict))
            session.add(pan)
