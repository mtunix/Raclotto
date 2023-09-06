import unittest
from typing import TYPE_CHECKING, Type

from flask import Config, Flask
from sqlalchemy import event, Engine

from back.src.driver.config import ConfigInMemory, ConfigProduction
from back.src.driver.database import db
from back.src.entity import *

session_id = "579a92ef-e037-4034-bf45-33b673861afc"


class DBTest(unittest.TestCase):
    """Base class for entity tests.
    Sets up a sqlite db and tears it down afterward.
    """

    def setUp(self):
        """
        Creates a new database for the unit test to use
        """
        if TYPE_CHECKING:
            self.session = db.session

        self.app = Flask(__name__)
        self.app.config.from_object(ConfigInMemory)
        db.init_app(self.app)

        with self.app.app_context() as app_context:
            db.create_all()
            app_context.push()

        if self.app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
            @event.listens_for(Engine, "connect")
            def set_sqlite_pragma(dbapi_connection, _):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys = ON;")
                cursor.close()

        self.session = db.session
        self.session.__request_id__ = ""
        self._insert_dummy_data()

    def tearDown(self):
        """
        Ensures that the database is emptied for next unit test
        """
        db.drop_all()

    def _insert_dummy_data(self):
        session = RaclottoSession(key=session_id, name="Test Session")
        self.session.add(session)
        self.session.commit()

        fills = [
            Ingredient(name="Pork", type=IngredientType.FILL, meat=True, session_id=session.id),
            Ingredient(name="Beef", type=IngredientType.FILL, meat=True, session_id=session.id),
            Ingredient(name="Chicken", type=IngredientType.FILL, meat=True, session_id=session.id),
            Ingredient(name="Potato", type=IngredientType.FILL, vegan=True, vegetarian=True, session_id=session.id),
            Ingredient(name="Mushroom", type=IngredientType.FILL, vegan=True, vegetarian=True, session_id=session.id),
            Ingredient(name="Tomato", type=IngredientType.FILL, vegan=True, vegetarian=True, fructose=True, histamine=True, session_id=session.id),
            Ingredient(name="Turkish Delight", type=IngredientType.FILL, vegetarian=True, gluten=True, session_id=session.id),
        ]

        sauces = [
            Ingredient(name="Aioli", type=IngredientType.SAUCE, vegetarian=True, session_id=session.id),
            Ingredient(name="Ketchup", type=IngredientType.SAUCE, vegetarian=True, fructose=True, histamine=True,
                       session_id=session.id),
            Ingredient(name="Mayo", type=IngredientType.SAUCE, vegetarian=True, session_id=session.id),
            Ingredient(name="Quark with herbs", type=IngredientType.SAUCE, vegetarian=True, lactose=True,
                       session_id=session.id),
        ]

        pans = [
            Pan(name="Pork Pan", user="abc", snacked=True, ingredients=[fills[0], sauces[0]], session_id=session.id),
            Pan(name="Beef Pan", user="abc", snacked=True, ingredients=[fills[1], sauces[1]], session_id=session.id),
            Pan(name="Chicken Pan", user="abc", snacked=True, ingredients=[fills[2], sauces[2]], session_id=session.id),
            Pan(name="Potato Pan", user="abc", snacked=True, ingredients=[fills[3], sauces[3]], session_id=session.id),
            Pan(name="Mushroom Pan", user="abc", snacked=True, ingredients=[fills[4], sauces[0]],
                session_id=session.id),
            Pan(name="Tomato Pan", user="abc", snacked=True, ingredients=[fills[5], sauces[1]], session_id=session.id),
            Pan(name="Turkish Delight Pan", user="abc", snacked=True, ingredients=[fills[6], sauces[2]],
                session_id=session.id),
        ]

        self.session.add_all(fills)
        self.session.add_all(sauces)
        self.session.add_all(pans)
        self.session.commit()
