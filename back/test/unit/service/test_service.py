import hashlib
import json
import unittest
from datetime import datetime

from sqlalchemy import event, create_engine

from back.src.model.database import SQLiteMixin, Database
from back.src.model.domain.base import Base
from back.src.model.domain.ingredient import Ingredient, IngredientType
from back.src.model.domain.pan import Pan
from back.src.model.domain.rating import Rating
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.pan_service import PanService


class TestService(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        self.engine = Database.engine("sqlite://")
        event.listen(self.engine, 'connect', self._fk_pragma_on_connect)
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)

    def test_query_ingredients_by_type_empty(self):
        service = IngredientService()
        self.assertEqual(len(service.all(self._get_session_id(), of_type=1)), 0)

    def test_query_ingredients_by_type(self):
        service = IngredientService()
        service.add(self._get_ingredient())
        self.assertEqual(len(service.all(self._get_session_id(), of_type=1)), 1)

    def test_generate_pan(self):
        p_service = PanService()
        i_service = IngredientService()
        for i in range(10):
            i_service.add(self._get_ingredient())

        self.assertIsInstance(p_service.generate(json.loads(self._get_gen_pan_json())), Pan)
        self.assertEqual(len(p_service.generate(json.loads(self._get_gen_pan_json())).ingredients), 4)

    def _get_gen_pan_json(self):
        return f"""{{
            "session_id": "{self._get_session_id()}",
            "user": "AldiAlfi",
            "num_fill": 2,
            "num_sauce": 2,
            "vegetarian": false,
            "vegan": false,
            "histamine": false,
            "fructose": false,
            "lactose": false,
            "gluten": false
        }}"""

    def _get_pan(self, session):
        return Pan(
            session_id=self._get_session_id(),
            ingredients=[session.query(Ingredient).first()],
            ratings=[]
        ).as_dict()

    def _get_rating(self):
        return Rating(
            user="AldiAlfi",
            rating=5,
            session_id=self._get_session_id()
        ).as_dict()

    def _get_ingredient(self):
        return Ingredient(
            name="Potato",
            session_id=self._get_session_id(),
            type=IngredientType.FILL,
            vegetarian=False,
            vegan=False,
            histamine=False,
            fructose=False,
            lactose=False
        ).as_dict()

    @staticmethod
    def _get_session_id():
        stamp = datetime(year=2021, month=1, day=1, hour=0, minute=0, second=0)
        return hashlib.sha256(str(stamp).encode("ASCII")).hexdigest()

