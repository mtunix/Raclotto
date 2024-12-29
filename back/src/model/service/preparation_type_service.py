from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload

from back.src.model.domain.preparation_type import PreparationType
from back.src.model.service.database_service import DatabaseService
from back.src.model.service.session_service import SessionService


class PreparationTypeService(DatabaseService):
    def __init__(self):
        super().__init__(PreparationType)
        self.session_service = SessionService()

    def all(self, session_key=None):
        try:
            sesh = self._get_session(self.session, session_key)
        except NoResultFound:
            return []

        if session_key:
            return self.session.query(PreparationType) \
                .options(joinedload(PreparationType.session)) \
                .filter(PreparationType.session_id == sesh.id) \
                .all()
        else:
            return self.session.query(PreparationType) \
                .options(joinedload(PreparationType.session)) \
                .all()

    def add(self, obj_dict):
        r_session = self.session_service.find_by_key(obj_dict["session_key"])
        del obj_dict["session_key"]

        with self.session.begin():
            prep_type = PreparationType(**obj_dict, session=r_session)
            self.session.add(prep_type)

        return self.find(prep_type.id)
