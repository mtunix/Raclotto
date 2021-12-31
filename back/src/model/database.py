from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Imports and their order are critical
from back.src.model.domain.achievement import Achievement
from back.src.model.domain.base import Base
from back.src.model.domain.rating import Rating


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
            event.listen(Achievement.__table__, 'after_create', Database._add_achievements)
            Base.metadata.create_all(Database._engine)

        return Database._engine

    @staticmethod
    def session():
        if not Database._session:
            Database._session = sessionmaker(
                Database.engine(),
                expire_on_commit=False,
                autocommit=True,
                autoflush=True
            )()

        return Database._session

    @staticmethod
    def _add_achievements():
        session = Database.session()

        achievements = [
            Achievement(
                title="Eat them all!",
                description="Alle Zutaten des Raclottos einmal gegessen",
                value=10
            )
        ]

        with session.begin():
            for achievement in achievements:
                session.add(achievement)
