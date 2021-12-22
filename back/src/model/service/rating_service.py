from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session, joinedload

from back.src.model.database import Database
from back.src.model.domain.pan import Pan
from back.src.model.domain.rating import Rating
from back.src.model.service.database_service import DatabaseService
from back.src.model.service.session_service import SessionService


class RatingService(DatabaseService):
    def __init__(self):
        super().__init__(Rating)
        self.session_service = SessionService()

    def add(self, obj_dict):
        r_session = self.session_service.find(obj_dict["session_key"])
        del obj_dict["session_key"]

        with self.session.begin():
            pan = self.session.query(Pan).filter_by(id=obj_dict["pan"]).one()
            del obj_dict["pan"]
            rating = Rating(**obj_dict, session_id=r_session.id)
            self.session.add(rating)
            pan.ratings.append(rating)
            self.session.add(pan)

        return rating
