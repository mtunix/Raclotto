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
                title="Gotta eat'em all!",
                description="Esse alle Zutaten des Raclottos",
                value=10,
                hidden = false
            ),
            Achievement(
                title="King of the sauce",
                description="Esse alle Saucen des Raclottos",
                value=10,
                hidden = false
            ),
            Achievement(
                title="Stack Overflow!",
                description="Esse eine Pfanne mit mehr als 10 Zutaten",
                value=8,
                hidden = false
            ),
            Achievement(
                title="King of the grill",
                description="Esse am meisten Pfannen in einem Raclotto",
                value=20,
                hidden = false
            ),
            Achievement(
                title="Garbage collector",
                description="Esse eine Pfanne nach einer 3-stündigen Pause",
                value=5,
                hidden = false
            ),
            Achievement(
                title="Happy new Year",
                description="Esse die erste Pfanne des Jahres",
                value=6,
                hidden = true

            ),
            Achievement(
                title="Local guide",
                description="Bewerte 10 Pfannen",
                value=3,
                hidden = false
            ),
            Achievement(
                title="Local host",
                description="Eröffne 10 Raclottos",
                value=10,
                hidden = false
            ),
            Achievement(
                title="First blood!",
                description="Esse die erste Pfanne des Raclottos",
                value=10,
                hidden = false
            ),
            Achievement(
                title="Double kill!",
                description="Erhalte eine identische Pfanne direkt hintereinander",
                value=30,
                hidden = false
            ),
            Achievement(
                title="Second to none",
                description="Starte eine Pfanne in der letzten Minute des Jahres",
                value=15,
                hidden = true
            ),
            Achievement(
                title="Zeit für ein D- D- D- Duel!",
                description="Beende ein Raclotto mit 2 Racleuren",
                value=8,
                hidden = true
            ),
            Achievement(
                title="Connoisseur",
                description="Füge eine nie dagewesene Zutat hinzu",
                value=3,
                hidden = false
            ),
            Achievement(
                title="Last pan standing",
                description="Esse die letzte Pfanne eines Raclottos",
                value=8,
                hidden = false
            ),
            Achievement(
                title="Easter egg",
                description="Esse eine Pfanne mit Ei an Ostern",
                value=50,
                hidden = false
            ),
            Achievement(
                title="Vanilla",
                description="",
                value=10,
                hidden = false
            ),
            Achievement(
                title="Pandler",
                description="Nimm an 2 Raclottos innerhalb von 24h teil",
                value=10,
                hidden=false
            ),
            Achievement(
                title="Wizard",
                description="Schätze die richtige Anzahl der Pfannen eines Raclottos",
                value=35,
                hidden=false
            ),
            Achievement(
                title="Survival of the fittest",
                description="Esse die schlecht bewerteste Pfanne",
                value=10,
                hidden=false
            ),
            Achievement(
                title="Raclottonormalverbraucher",
                description="Esse eine Pfanne mit Käse und Kartoffel",
                value=12,
                hidden=false
            ),
            Achievement(
                title="verPant",
                description="Mache deine erste Pfanne eine Stunde nach Start des Raclottos",
                value=5,
                hidden=true
            ),
            Achievement(
                title="Pantastic",
                description="Erstelle die best bewerteste Pfanne eines Raclottos",
                value=8,
                hidden=false
            ),
            Achievement(
                title="Steakholder",
                description="Esse 5 Pfannen mit Fleisch",
                value=5,
                hidden=false
            ),
            Achievement(
                title="Biotonne",
                description="Esse 5 vegane Pfannen",
                value=5,
                hidden=false
            ),
            Achievement(
                title="Pan sexual",
                description="Bewerte deine Pfannen mit durchschnittlich 4+",
                value=8,
                hidden=true
            ),
            Achievement(
                title="JaPan",
                description="Esse eine Pfanne mit ausschließlich Fisch",
                value=12,
                hidden=false
            ),
            Achievement(
                title="Pan-O-Rama",
                description="Esse eine Pfanne mit Butter",
                value=5,
                hidden=false
            ),
            Achievement(
                title="Panini",
                description="Esse eine Pfanne mit Teig",
                value=6,
                hidden=false
            ),
            Achievement(
                title="Panda",
                description="Esse eine Pfanne mit 5 Gemüsezutaten und sonst nichts",
                value=11,
                hidden=false
            ),
            Achievement(
                title="Pan-nic",
                description="Starte ein Raclotto unter freim Himmel",
                value=15,
                hidden=false
            ),

        ]

        with session.begin():
            for achievement in achievements:
                session.add(achievement)
