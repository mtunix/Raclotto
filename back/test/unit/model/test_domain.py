import hashlib
import unittest
from datetime import datetime

from sqlalchemy import event
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from back.src.model.database import SQLiteMixin
from back.src.model.domain.base import Base
from back.src.model.domain.ingredient import Ingredient, IngredientType
from back.src.model.domain.rating import Rating
from back.src.model.domain.pan import Pan


class TestDomain(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        event.listen(self.engine, 'connect', self._fk_pragma_on_connect)
        Base.metadata.create_all(self.engine)

    def test_creation(self):
        with Session(self.engine) as session:
            self.assertEqual(session.query(Ingredient).all(), [])

    def test_insert_ingredient(self):
        with Session(self.engine) as session:
            with session.begin():
                session.add(self._get_ingredient())
            self.assertEqual(len(session.query(Ingredient).all()), 1)

    def test_insert_rating(self):
        with Session(self.engine) as session:
            with session.begin():
                session.add(self._get_ingredient())
                session.add(self._get_rating())
            self.assertEqual(len(session.query(Rating).all()), 1)

    def test_insert_pan(self):
        with Session(self.engine) as session:
            with session.begin():
                session.add(self._get_ingredient())
                session.add(self._get_pan(session))
            self.assertEqual(len(session.query(Pan).all()), 1)

    def test_delete(self):
        with Session(self.engine) as session, session.begin():
            session.add(self._get_ingredient())
            self.assertEqual(len(session.query(Ingredient).all()), 1)
            ingredient = session.query(Ingredient).first()
            session.delete(ingredient)
            self.assertEqual(len(session.query(Ingredient).all()), 0)

    def test_delete_associated(self):
        with self.assertRaises(IntegrityError) as context:
            with Session(self.engine) as session, session.begin():
                session.add(self._get_ingredient())
                self.assertEqual(len(session.query(Ingredient).all()), 1)
                ingredient = session.query(Ingredient).first()
                session.add(self._get_pan(session))
                session.delete(ingredient)
                self.assertEqual(len(session.query(Ingredient).all()), 0)

        self.assertEqual(context.exception.__class__, IntegrityError)

    @staticmethod
    def _get_pan(session):
        return Pan(
            session_id=hashlib.sha256(str(datetime.now()).encode("ASCII")).hexdigest(),
            ingredients=[session.query(Ingredient).first()],
            ratings=[]
        )

    @staticmethod
    def _get_rating():
        return Rating(
            user="AldiAlfi",
            rating=5
        )

    @staticmethod
    def _get_ingredient():
        return Ingredient(
            name="Potato",
            session_id=hashlib.sha256(str(datetime.now()).encode("ASCII")).hexdigest(),
            type=IngredientType.FILL,
            vegetarian=False,
            vegan=False,
            histamine=False,
            fructose=False,
            lactose=False
        )
