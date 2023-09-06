from back.src.entity.pan import Pan
from back.src.entity.rating import Rating
from back.src.interactor.database_service import DatabaseInteractor
from back.src.interactor.session_service import SessionService


class RatingService(DatabaseInteractor):
    def __init__(self):
        super().__init__(Rating)
        self.session_service = SessionService()

    def add(self, obj_dict):
        r_session = self.session_service.find_by_key(obj_dict["session_key"])
        del obj_dict["session_key"]

        with self.session.begin():
            pan = self.session.query(Pan).filter_by(id=obj_dict["pan"]).one()
            del obj_dict["pan"]
            rating = Rating(**obj_dict, session_id=r_session.id)
            self.session.add(rating)
            pan.ratings.append(rating)
            self.session.add(pan)

        return rating
