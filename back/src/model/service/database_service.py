from sqlalchemy.orm import Session

from back.src.model.database import Database


class DatabaseService:
    def __init__(self, domain_type):
        self.domain_type = domain_type

    def all(self, session_id=None):
        with Session(Database.engine()) as session:
            if session_id:
                return session.query(self.domain_type).filter(self.domain_type.session_id == session_id).all()
            else:
                return session.query(self.domain_type).all()

    def add(self, obj_dict):
        with Session(Database.engine()) as session, session.begin():
            session.add(self.domain_type(**obj_dict))

    def find(self, id):
        with Session(Database.engine()) as session, session.begin():
            return session.query(self.domain_type).filter_by(id=id).one()
