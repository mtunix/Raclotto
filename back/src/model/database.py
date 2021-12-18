from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from back.src.model.domain.base import Base


class SQLiteMixin:
    @staticmethod
    def _fk_pragma_on_connect(dbapi_con, _):
        dbapi_con.execute('pragma foreign_keys=ON')


class Database(SQLiteMixin):
    _engine = None
    _session = None

    @staticmethod
    def engine(url="sqlite:///raclotto.db"):
        if not Database._engine:
            Database._engine = create_engine(url)
            event.listen(Database._engine, 'connect', Database._fk_pragma_on_connect)
            Base.metadata.create_all(Database._engine)

        return Database._engine

    @staticmethod
    def session():
        if not Database._session:
            Database._session = sessionmaker(Database.engine(), expire_on_commit=False)

        return Database._session()

